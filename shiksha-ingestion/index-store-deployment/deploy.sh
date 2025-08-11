#!/bin/bash
# Deploy Azure infra (idempotent), attach data disk, then provision VM to run Neo4j + Qdrant
set -euo pipefail

# Load config
CONFIG_FILE="config.env"
[ -f "$CONFIG_FILE" ] || { echo "❌ $CONFIG_FILE not found"; exit 1; }
source "$CONFIG_FILE"

# Load helpers
source ./helpers.sh

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

echo -e "${GREEN}🚀 Deploying VM + data disk + Neo4j + Qdrant${NC}"
echo -e "${BLUE}RG: ${RESOURCE_GROUP} | Loc: ${LOCATION} | VM: ${VM_NAME} | Disk: ${DISK_NAME} (LUN ${DATA_DISK_LUN})${NC}"

# Login check
if ! az account show &>/dev/null; then
  echo -e "${RED}❌ Not logged in. Run 'az login'.${NC}"; exit 1
fi

# SSH keys check
[ -f ~/.ssh/id_rsa ] || { echo -e "${RED}❌ ~/.ssh/id_rsa missing${NC}"; exit 1; }
[ -f ~/.ssh/id_rsa.pub ] || { echo -e "${RED}❌ ~/.ssh/id_rsa.pub missing${NC}"; exit 1; }

# 1) RG
if exists_rg "$RESOURCE_GROUP"; then
  echo "✅ RG exists: $RESOURCE_GROUP"
else
  echo "📦 Creating RG..."
  az group create -n "$RESOURCE_GROUP" -l "$LOCATION" --output table
fi

# 2) NSG
if exists_nsg "$RESOURCE_GROUP" "$NSG_NAME"; then
  echo "✅ NSG exists: $NSG_NAME"
else
  echo "🔒 Creating NSG..."
  az network nsg create -g "$RESOURCE_GROUP" -n "$NSG_NAME" -l "$LOCATION" --output table
fi

# NSG rules (allowlist if provided)
SOURCES="${QDRANT_ALLOWED_CIDRS:-*}"
create_rule_if_missing "$RESOURCE_GROUP" "$NSG_NAME" "SSH"         22   1001 "*"
create_rule_if_missing "$RESOURCE_GROUP" "$NSG_NAME" "Neo4j-HTTP"  7474 1002 "*"
create_rule_if_missing "$RESOURCE_GROUP" "$NSG_NAME" "Neo4j-HTTPS" 7473 1003 "*"
create_rule_if_missing "$RESOURCE_GROUP" "$NSG_NAME" "Neo4j-Bolt"  7687 1004 "*"
create_rule_if_missing "$RESOURCE_GROUP" "$NSG_NAME" "Qdrant-HTTP" 6333 1005 "$SOURCES"
create_rule_if_missing "$RESOURCE_GROUP" "$NSG_NAME" "Qdrant-gRPC" 6334 1006 "$SOURCES"

# 3) VNet/Subnet
if exists_vnet "$RESOURCE_GROUP" "$VNET_NAME"; then
  echo "✅ VNet exists: $VNET_NAME"
  if ! az network vnet subnet show -g "$RESOURCE_GROUP" --vnet-name "$VNET_NAME" -n "$SUBNET_NAME" &>/dev/null; then
    echo "🌐 Creating subnet..."
    az network vnet subnet create -g "$RESOURCE_GROUP" --vnet-name "$VNET_NAME" -n "$SUBNET_NAME" --address-prefixes 10.1.0.0/24 --output table
  fi
else
  echo "🌐 Creating VNet+Subnet..."
  az network vnet create -g "$RESOURCE_GROUP" -n "$VNET_NAME" --address-prefix 10.1.0.0/16 \
    --subnet-name "$SUBNET_NAME" --subnet-prefix 10.1.0.0/24 -l "$LOCATION" --output table
fi

# 4) Public IP
if exists_pip "$RESOURCE_GROUP" "$PUBLIC_IP_NAME"; then
  echo "✅ Public IP exists: $PUBLIC_IP_NAME"
else
  echo "🌍 Creating Public IP..."
  az network public-ip create -g "$RESOURCE_GROUP" -n "$PUBLIC_IP_NAME" --allocation-method Static --sku Standard -l "$LOCATION" --output table
fi

# 5) NIC
if exists_nic "$RESOURCE_GROUP" "$NIC_NAME"; then
  echo "✅ NIC exists: $NIC_NAME"
else
  echo "🔌 Creating NIC..."
  az network nic create -g "$RESOURCE_GROUP" -n "$NIC_NAME" \
    --vnet-name "$VNET_NAME" --subnet "$SUBNET_NAME" \
    --public-ip-address "$PUBLIC_IP_NAME" --network-security-group "$NSG_NAME" \
    -l "$LOCATION" --output table
fi

# 6) VM
if exists_vm "$RESOURCE_GROUP" "$VM_NAME"; then
  echo "✅ VM exists: $VM_NAME"
else
  echo "💻 Creating VM (Ubuntu 22.04)..."
  az vm create -g "$RESOURCE_GROUP" -n "$VM_NAME" --size "$VM_SIZE" --image Ubuntu2204 \
    --admin-username "$ADMIN_USERNAME" --ssh-key-values ~/.ssh/id_rsa.pub \
    --nics "$NIC_NAME" --storage-sku Premium_LRS -l "$LOCATION" --output table
fi

# 7) Data disk
if exists_disk "$RESOURCE_GROUP" "$DISK_NAME"; then
  echo "✅ Disk exists: $DISK_NAME"
else
  echo "💽 Creating managed disk: $DISK_NAME (${DISK_SIZE_GB}GB)..."
  az disk create -g "$RESOURCE_GROUP" -n "$DISK_NAME" --size-gb "$DISK_SIZE_GB" --sku Premium_LRS -l "$LOCATION" --output table
fi

# Attach disk if not attached
if vm_has_disk "$RESOURCE_GROUP" "$VM_NAME" "$DISK_NAME"; then
  echo "✅ Disk already attached to VM"
else
  echo "🔗 Attaching disk to VM at LUN ${DATA_DISK_LUN}..."
  az vm disk attach -g "$RESOURCE_GROUP" --vm-name "$VM_NAME" --name "$DISK_NAME" --lun "$DATA_DISK_LUN" --output table
fi

# 8) Public IP
PUBLIC_IP=$(az network public-ip show -g "$RESOURCE_GROUP" -n "$PUBLIC_IP_NAME" --query ipAddress -o tsv)
echo -e "${YELLOW}📍 Public IP: ${PUBLIC_IP}${NC}"

# Wait for SSH (best-effort)
echo "⏳ Waiting for SSH..."
for i in {1..8}; do
  if ssh -i ~/.ssh/id_rsa -o ConnectTimeout=8 -o StrictHostKeyChecking=no "${ADMIN_USERNAME}@${PUBLIC_IP}" 'echo ok' &>/dev/null; then
    echo "✅ SSH reachable"; break
  else
    echo "…retry $i"; sleep 10
  fi
done

# 9) Copy and run the VM provisioner
echo "📤 Copying vm_provision.sh to VM..."
scp -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no ./vm_provision.sh "${ADMIN_USERNAME}@${PUBLIC_IP}:/tmp/vm_provision.sh"
ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no "${ADMIN_USERNAME}@${PUBLIC_IP}" "chmod +x /tmp/vm_provision.sh"

echo "🏗️  Running provisioner on VM..."
ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no "${ADMIN_USERNAME}@${PUBLIC_IP}" \
  "NEO4J_PASSWORD='${NEO4J_PASSWORD}' DATA_MOUNT='${DATA_MOUNT}' DATA_DISK_LUN='${DATA_DISK_LUN}' /tmp/vm_provision.sh"

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${YELLOW}SSH:${NC} ssh -i ~/.ssh/id_rsa ${ADMIN_USERNAME}@${PUBLIC_IP}"
echo -e "${YELLOW}Neo4j Web:${NC}   http://${PUBLIC_IP}:7474"
echo -e "${YELLOW}Neo4j Bolt:${NC}  bolt://${PUBLIC_IP}:7687"
echo -e "${YELLOW}Qdrant HTTP:${NC} http://${PUBLIC_IP}:6333"
echo -e "${YELLOW}Qdrant gRPC:${NC} ${PUBLIC_IP}:6334"

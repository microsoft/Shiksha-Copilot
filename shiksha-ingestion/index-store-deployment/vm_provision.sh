#!/bin/bash
# Provision Docker, mount the data disk, and run Neo4j + Qdrant with persistent storage
# Expects environment variables to be exported by the caller:
#   NEO4J_PASSWORD, DATA_MOUNT, DATA_DISK_LUN

set -euo pipefail

echo "🔄 Updating packages..."
sudo apt-get update -y

# Install Docker if missing
if ! command -v docker &>/dev/null; then
  echo "🐳 Installing Docker..."
  sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  sudo usermod -aG docker "$USER" || true
fi

# ---------- Mount data disk (by LUN) ----------
LUN_PATH="/dev/disk/azure/scsi1/lun${DATA_DISK_LUN}"
if [ ! -b "$LUN_PATH" ]; then
  echo "❌ Data disk device not found at $LUN_PATH"; exit 1
fi

sudo mkdir -p "$DATA_MOUNT"

# If no filesystem, create one
if ! sudo blkid "$LUN_PATH" >/dev/null 2>&1; then
  echo "🧱 Creating ext4 filesystem on $LUN_PATH..."
  sudo mkfs.ext4 -F "$LUN_PATH"
fi

# Ensure /etc/fstab entry (by UUID) exists
UUID=$(sudo blkid -s UUID -o value "$LUN_PATH")
if ! grep -q "$UUID" /etc/fstab; then
  echo "🧷 Adding fstab entry for data disk..."
  echo "UUID=$UUID  $DATA_MOUNT  ext4  defaults,nofail  0  2" | sudo tee -a /etc/fstab >/dev/null
fi

# Mount (idempotent)
sudo mount -a

# Create app directories on mounted disk
sudo mkdir -p "${DATA_MOUNT}/neo4j/"{data,logs,import,plugins,conf}
sudo mkdir -p "${DATA_MOUNT}/qdrant/storage"

# Ownership for container users
# Neo4j runs as UID:GID 7474, Qdrant as 1000:1000
sudo chown -R 7474:7474 "${DATA_MOUNT}/neo4j" || true
sudo chown -R 1000:1000 "${DATA_MOUNT}/qdrant" || true

# Public IP for advertised addresses
PUBLIC_IP_VM=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')

# ---------- Neo4j container (idempotent) ----------
if sudo docker ps -a --format '{{.Names}}' | grep -q '^neo4j$'; then
  echo "♻️ Neo4j container exists; ensuring it's running..."
  sudo docker start neo4j >/dev/null 2>&1 || true
else
  echo "🐳 Starting Neo4j..."
  sudo docker run -d \
    --name neo4j \
    --restart unless-stopped \
    -p 7474:7474 -p 7473:7473 -p 7687:7687 \
    -v "${DATA_MOUNT}/neo4j/data:/data" \
    -v "${DATA_MOUNT}/neo4j/logs:/logs" \
    -v "${DATA_MOUNT}/neo4j/import:/var/lib/neo4j/import" \
    -v "${DATA_MOUNT}/neo4j/plugins:/plugins" \
    -e NEO4J_AUTH="neo4j/${NEO4J_PASSWORD}" \
    -e NEO4J_server_default__listen__address=0.0.0.0 \
    -e NEO4J_server_default__advertised__address="$PUBLIC_IP_VM" \
    -e NEO4J_server_bolt_advertised__address="$PUBLIC_IP_VM:7687" \
    -e NEO4J_server_http_advertised__address="$PUBLIC_IP_VM:7474" \
    -e NEO4J_server_https_advertised__address="$PUBLIC_IP_VM:7473" \
    -e NEO4J_dbms_security_procedures_unrestricted="gds.*,apoc.*" \
    -e NEO4J_dbms_security_procedures_allowlist="gds.*,apoc.*" \
    neo4j:5.15.0
fi

# ---------- Qdrant container (idempotent) ----------
if sudo docker ps -a --format '{{.Names}}' | grep -q '^qdrant$'; then
  echo "♻️ Qdrant container exists; ensuring it's running..."
  sudo docker start qdrant >/dev/null 2>&1 || true
else
  echo "🐳 Starting Qdrant..."
  sudo docker run -d \
    --name qdrant \
    --restart unless-stopped \
    -p 6333:6333 -p 6334:6334 \
    -v "${DATA_MOUNT}/qdrant/storage:/qdrant/storage" \
    qdrant/qdrant:latest
fi

# ---------- UFW (idempotent) ----------
if ! sudo ufw status | grep -qw active; then
  sudo ufw --force enable
fi
for p in 22 7474 7473 7687 6333 6334; do
  sudo ufw allow "${p}/tcp" || true
done

echo "⏳ Waiting for services..."
sleep 20
echo "🔎 Containers:"
sudo docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
echo "📋 Qdrant logs (tail):"
sudo docker logs qdrant --tail 20 || true
echo "📋 Neo4j logs (tail):"
sudo docker logs neo4j --tail 20 || true
echo "✅ VM provisioning complete."

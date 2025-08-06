#!/bin/bash

# Neo4j VM Deployment Script with Configuration File
# This script creates a VM with Neo4j Community Edition installed

set -e  # Exit on any error

# Load configuration
CONFIG_FILE="config.env"
if [ -f "$CONFIG_FILE" ]; then
    echo "📋 Loading configuration from $CONFIG_FILE..."
    source "$CONFIG_FILE"
else
    echo "❌ Configuration file $CONFIG_FILE not found!"
    echo "Please create config.env file with your settings."
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Neo4j VM deployment...${NC}"
echo -e "${BLUE}Resource Group: ${RESOURCE_GROUP}${NC}"
echo -e "${BLUE}Location: ${LOCATION}${NC}"
echo -e "${BLUE}VM Name: ${VM_NAME}${NC}"
echo -e "${BLUE}VM Size: ${VM_SIZE}${NC}"
echo -e "${BLUE}Admin Username: ${ADMIN_USERNAME}${NC}"
echo ""

# Check if logged in to Azure
echo -e "${YELLOW}📋 Checking Azure login status...${NC}"
if ! az account show &>/dev/null; then
    echo -e "${RED}❌ Not logged in to Azure. Please run 'az login' first.${NC}"
    exit 1
fi

# Check if SSH keys exist
if [ ! -f ~/.ssh/id_rsa ]; then
    echo -e "${RED}❌ SSH private key not found at ~/.ssh/id_rsa${NC}"
    echo -e "${YELLOW}Please ensure your SSH private key is at ~/.ssh/id_rsa${NC}"
    exit 1
fi

if [ ! -f ~/.ssh/id_rsa.pub ]; then
    echo -e "${RED}❌ SSH public key not found at ~/.ssh/id_rsa.pub${NC}"
    echo -e "${YELLOW}Please ensure your SSH public key is at ~/.ssh/id_rsa.pub${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed!${NC}"
echo ""

# Create resource group if it doesn't exist
echo -e "${YELLOW}📦 Creating resource group: ${RESOURCE_GROUP}...${NC}"
az group create \
    --name "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --output table

echo ""

# Create Network Security Group with rules for Neo4j
echo -e "${YELLOW}🔒 Creating Network Security Group...${NC}"
az network nsg create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$NSG_NAME" \
    --location "$LOCATION" \
    --output table

# Add security rules
echo -e "${YELLOW}🔐 Adding security rules...${NC}"
az network nsg rule create \
    --resource-group "$RESOURCE_GROUP" \
    --nsg-name "$NSG_NAME" \
    --name "SSH" \
    --protocol tcp \
    --priority 1001 \
    --destination-port-range 22 \
    --access allow \
    --output none

az network nsg rule create \
    --resource-group "$RESOURCE_GROUP" \
    --nsg-name "$NSG_NAME" \
    --name "Neo4j-HTTP" \
    --protocol tcp \
    --priority 1002 \
    --destination-port-range 7474 \
    --access allow \
    --output none

az network nsg rule create \
    --resource-group "$RESOURCE_GROUP" \
    --nsg-name "$NSG_NAME" \
    --name "Neo4j-HTTPS" \
    --protocol tcp \
    --priority 1003 \
    --destination-port-range 7473 \
    --access allow \
    --output none

az network nsg rule create \
    --resource-group "$RESOURCE_GROUP" \
    --nsg-name "$NSG_NAME" \
    --name "Neo4j-Bolt" \
    --protocol tcp \
    --priority 1004 \
    --destination-port-range 7687 \
    --access allow \
    --output none

echo -e "${GREEN}✅ Security rules created${NC}"

# Create Virtual Network
echo -e "${YELLOW}🌐 Creating Virtual Network...${NC}"
az network vnet create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$VNET_NAME" \
    --address-prefix 10.1.0.0/16 \
    --subnet-name "$SUBNET_NAME" \
    --subnet-prefix 10.1.0.0/24 \
    --location "$LOCATION" \
    --output table

# Create Public IP
echo -e "${YELLOW}🌍 Creating Public IP...${NC}"
az network public-ip create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$PUBLIC_IP_NAME" \
    --allocation-method Static \
    --sku Standard \
    --location "$LOCATION" \
    --output table

# Create Network Interface
echo -e "${YELLOW}🔌 Creating Network Interface...${NC}"
az network nic create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$NIC_NAME" \
    --vnet-name "$VNET_NAME" \
    --subnet "$SUBNET_NAME" \
    --public-ip-address "$PUBLIC_IP_NAME" \
    --network-security-group "$NSG_NAME" \
    --location "$LOCATION" \
    --output table

# Create VM
echo -e "${YELLOW}💻 Creating Virtual Machine (this may take a few minutes)...${NC}"

az vm create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$VM_NAME" \
    --size "$VM_SIZE" \
    --image Ubuntu2204 \
    --admin-username "$ADMIN_USERNAME" \
    --ssh-key-values ~/.ssh/id_rsa.pub \
    --nics "$NIC_NAME" \
    --storage-sku Premium_LRS \
    --location "$LOCATION" \
    --output table

# Get the public IP address
echo -e "${YELLOW}📍 Getting public IP address...${NC}"
PUBLIC_IP=$(az network public-ip show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$PUBLIC_IP_NAME" \
    --query ipAddress \
    --output tsv)

echo -e "${GREEN}✅ VM created successfully! Public IP: ${PUBLIC_IP}${NC}"

# Wait a bit for VM to be fully ready
echo -e "${YELLOW}⏳ Waiting for VM to be fully ready...${NC}"
sleep 30

# Test SSH connectivity
echo -e "${YELLOW}🔗 Testing SSH connectivity...${NC}"
for i in {1..5}; do
    if ssh -i ~/.ssh/id_rsa -o ConnectTimeout=10 -o StrictHostKeyChecking=no ${ADMIN_USERNAME}@${PUBLIC_IP} 'echo "SSH connection successful"' 2>/dev/null; then
        echo -e "${GREEN}✅ SSH connection established${NC}"
        break
    else
        echo -e "${YELLOW}⏳ Waiting for SSH... (attempt $i/5)${NC}"
        sleep 15
    fi
done

# Create Neo4j installation script
echo -e "${YELLOW}📝 Installing Docker and Neo4j on the VM...${NC}"
ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no ${ADMIN_USERNAME}@${PUBLIC_IP} << EOF
#!/bin/bash
set -e

echo "🔄 Updating system packages..."
sudo apt-get update -y

echo "🐳 Installing Docker..."
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up the stable repository
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \$(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker \$USER

echo "📁 Creating Neo4j data directories..."
sudo mkdir -p /opt/neo4j/data
sudo mkdir -p /opt/neo4j/logs
sudo mkdir -p /opt/neo4j/import
sudo mkdir -p /opt/neo4j/plugins
sudo mkdir -p /opt/neo4j/conf

# Set proper permissions
sudo chown -R 7474:7474 /opt/neo4j/

echo "🐳 Starting Neo4j Docker container..."
PUBLIC_IP_VM=\$(curl -s ifconfig.me)
sudo docker run -d \\
    --name neo4j \\
    --restart unless-stopped \\
    -p 7474:7474 \\
    -p 7473:7473 \\
    -p 7687:7687 \\
    -v /opt/neo4j/data:/data \\
    -v /opt/neo4j/logs:/logs \\
    -v /opt/neo4j/import:/var/lib/neo4j/import \\
    -v /opt/neo4j/plugins:/plugins \\
    -e NEO4J_AUTH=neo4j/$NEO4J_PASSWORD \\
    -e NEO4J_server_default__listen__address=0.0.0.0 \\
    -e NEO4J_server_default__advertised__address=\$PUBLIC_IP_VM \\
    -e NEO4J_server_bolt_advertised__address=\$PUBLIC_IP_VM:7687 \\
    -e NEO4J_server_http_advertised__address=\$PUBLIC_IP_VM:7474 \\
    -e NEO4J_server_https_advertised__address=\$PUBLIC_IP_VM:7473 \\
    -e NEO4J_dbms_security_procedures_unrestricted=gds.*,apoc.* \\
    -e NEO4J_dbms_security_procedures_allowlist=gds.*,apoc.* \\
    neo4j:5.15.0

echo "🔥 Configuring firewall..."
sudo ufw --force enable
sudo ufw allow 22/tcp
sudo ufw allow 7474/tcp
sudo ufw allow 7473/tcp
sudo ufw allow 7687/tcp

echo "⏳ Waiting for Neo4j to start..."
sleep 45

echo "🔍 Checking Neo4j container status..."
sudo docker ps | grep neo4j

echo "📋 Neo4j container logs (last 10 lines):"
sudo docker logs neo4j --tail 10

echo "✅ Neo4j Docker installation completed!"
EOF

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo -e "${GREEN}📋 Connection Information:${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Public IP Address:${NC} $PUBLIC_IP"
echo -e "${YELLOW}SSH Command:${NC} ssh -i ~/.ssh/id_rsa ${ADMIN_USERNAME}@${PUBLIC_IP}"
echo -e "${YELLOW}Neo4j Web Interface:${NC} http://${PUBLIC_IP}:7474"
echo -e "${YELLOW}Neo4j Bolt Connection:${NC} bolt://${PUBLIC_IP}:7687"
echo -e "${YELLOW}Username:${NC} neo4j"
echo -e "${YELLOW}Password:${NC} $NEO4J_PASSWORD"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}🔧 Useful Commands:${NC}"
echo -e "${BLUE}Check Neo4j container status:${NC} ssh -i ~/.ssh/id_rsa ${ADMIN_USERNAME}@${PUBLIC_IP} 'sudo docker ps | grep neo4j'"
echo -e "${BLUE}View Neo4j logs:${NC} ssh -i ~/.ssh/id_rsa ${ADMIN_USERNAME}@${PUBLIC_IP} 'sudo docker logs neo4j -f'"
echo -e "${BLUE}Restart Neo4j container:${NC} ssh -i ~/.ssh/id_rsa ${ADMIN_USERNAME}@${PUBLIC_IP} 'sudo docker restart neo4j'"
echo -e "${BLUE}Stop Neo4j container:${NC} ssh -i ~/.ssh/id_rsa ${ADMIN_USERNAME}@${PUBLIC_IP} 'sudo docker stop neo4j'"
echo -e "${BLUE}Start Neo4j container:${NC} ssh -i ~/.ssh/id_rsa ${ADMIN_USERNAME}@${PUBLIC_IP} 'sudo docker start neo4j'"
echo -e "${BLUE}Access Neo4j shell:${NC} ssh -i ~/.ssh/id_rsa ${ADMIN_USERNAME}@${PUBLIC_IP} 'sudo docker exec -it neo4j cypher-shell -u neo4j -p ${NEO4J_PASSWORD}'"
echo -e "${BLUE}Check data directory:${NC} ssh -i ~/.ssh/id_rsa ${ADMIN_USERNAME}@${PUBLIC_IP} 'sudo ls -la /opt/neo4j/'"
echo ""
echo -e "${GREEN}🗑️ To clean up all resources:${NC}"
echo -e "${RED}az group delete --name $RESOURCE_GROUP --yes --no-wait${NC}"
echo ""
echo -e "${GREEN}🌐 Open Neo4j Browser at: ${BLUE}http://${PUBLIC_IP}:7474${NC}"

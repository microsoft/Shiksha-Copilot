#!/bin/bash

# User configuration variables (edit these values as needed)
FUNCTION_APP_NAME="lpworkflowdurable"  # Azure Function App name
RESOURCE_GROUP="shikshacopilot"            # Azure Resource Group name
PYTHON_VERSION="python3.10"                   # Python version to use
BUILD_NATIVE_DEPS=true                        # Whether to build native dependencies

# Define the function to print steps
print_step() {
    echo "=============================="
    echo "$1"
    echo "=============================="
}

# Remove old packages and virtual environment
print_step "Removing old packages and virtual environment..."
rm -rf .python_packages
rm -rf .venv
rm -rf __pycache__

# Check for Poetry
print_step "Checking for Poetry..."
if ! command -v poetry &> /dev/null; then
    echo "Poetry not found. Please install it using:"
    echo "curl -sSL https://install.python-poetry.org | python3 -"
    exit 1
fi

# Generate requirements.txt from pyproject.toml
print_step "Generating requirements.txt from pyproject.toml..."
if [ -f "pyproject.toml" ]; then
    echo "Found pyproject.toml, generating requirements.txt..."
    poetry export --without-hashes --format=requirements.txt --output=requirements.txt
    echo "requirements.txt generated successfully."
else
    echo "Error: pyproject.toml not found!"
    exit 1
fi

# Create a new virtual environment
print_step "Creating a new virtual environment..."
$PYTHON_VERSION -m venv .venv

# Activate the virtual environment
print_step "Activating the virtual environment..."
source .venv/bin/activate

# Install the required packages
print_step "Installing the required packages..."
pip install -r requirements.txt

# Check for Azure Function Core Tools
print_step "Checking for Azure Function Core Tools..."
if ! command -v func &> /dev/null; then
    echo "Azure Function Core Tools not found. Please install it using:"
    echo "npm install -g azure-functions-core-tools@4 --unsafe-perm true"
    exit 1
fi

# Check for Azure CLI
print_step "Checking for Azure CLI..."
if ! command -v az &> /dev/null; then
    echo "Azure CLI not found. Please install it from:"
    echo "https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Display Function App configuration
print_step "Using Azure Function App Configuration"
echo "Function App Name: $FUNCTION_APP_NAME"
echo "Resource Group: $RESOURCE_GROUP"
echo ""

# Extract environment variables from local.settings.json
print_step "Extracting environment variables from local.settings.json..."
if [ -f "local.settings.json" ]; then
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        echo "jq is not installed. Please install it using:"
        echo "sudo apt-get install jq"
        exit 1
    fi
    
    # Extract environment variables from local.settings.json
    echo "Creating settings file for Azure..."
    jq '.Values' local.settings.json > azure_settings.json
    
    echo "Environment variables extracted to azure_settings.json"
else
    echo "Error: local.settings.json not found!"
    exit 1
fi

# Deploy the function app
print_step "Publishing the Azure function app..."
if [ "$BUILD_NATIVE_DEPS" = true ]; then
    func azure functionapp publish $FUNCTION_APP_NAME --build-native-deps | tee publish.log
else
    func azure functionapp publish $FUNCTION_APP_NAME | tee publish.log
fi

# Display the log file content
print_step "Displaying the publish logs..."
cat publish.log

# Check if deployment was successful
if grep -q "Deployment completed successfully" publish.log; then
    print_step "Deployment completed successfully!"
    
    # Upload environment variables to Azure
    print_step "Uploading environment variables to Azure Function App..."
    echo "This may take a moment..."
    
    # Use Azure CLI to upload settings
    az functionapp config appsettings set --name $FUNCTION_APP_NAME --resource-group $RESOURCE_GROUP --settings @azure_settings.json
    
    # Check the result
    if [ $? -eq 0 ]; then
        echo "Environment variables uploaded successfully!"
    else
        echo "Failed to upload environment variables. Please check your Azure CLI configuration."
        echo "You can manually set them in the Azure Portal."
    fi
else
    print_step "Deployment might have issues. Please check the logs above."
fi

# Clean up
print_step "Cleaning up temporary files..."
rm -f azure_settings.json
rm -f requirements.txt  # Remove generated requirements.txt

print_step "Deployment process completed!"
echo "Your application is now deployed with environment variables configured."
echo "You can verify the settings in the Azure Portal under Configuration section."

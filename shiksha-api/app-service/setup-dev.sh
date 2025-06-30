#!/bin/bash
# Development environment setup script

# Don’t treat a broken‐pipe on stdout as a fatal error
trap '' SIGPIPE

set -e  # Exit on any error

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

# Install additional dev packages if not already in requirements.txt
pip list | grep -q flake8 || pip install flake8
pip list | grep -q black || pip install black
pip list | grep -q isort || pip install isort
pip list | grep -q mypy || pip install mypy
pip list | grep -q pytest || pip install pytest

echo ""
echo "Development environment setup complete!"
echo "Your Python virtual environment is ready."
echo ""
echo "To activate it manually:"
echo "  source venv/bin/activate"
echo ""
echo "VS Code will now use:"
echo "  - Python interpreter: ./venv/bin/python"
echo "  - Black formatter on save (line length: 100)"
echo "  - Flake8 linting on save"
echo "  - isort for import sorting"
echo "  - mypy for type checking"
echo ""
echo "Happy coding!"

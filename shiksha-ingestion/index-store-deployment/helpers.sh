#!/bin/bash
set -euo pipefail

exists_rg()    { az group exists --name "$1" | grep -q true; }
exists_nsg()   { az network nsg show -g "$1" -n "$2" &>/dev/null; }
exists_vnet()  { az network vnet show -g "$1" -n "$2" &>/dev/null; }
exists_pip()   { az network public-ip show -g "$1" -n "$2" &>/dev/null; }
exists_nic()   { az network nic show -g "$1" -n "$2" &>/dev/null; }
exists_vm()    { az vm show -g "$1" -n "$2" &>/dev/null; }
exists_disk()  { az disk show -g "$1" -n "$2" &>/dev/null; }
exists_rule()  { az network nsg rule show -g "$1" --nsg-name "$2" -n "$3" &>/dev/null; }

vm_has_disk() {
  local rg="$1" vm="$2" disk="$3"
  az vm show -g "$rg" -n "$vm" --query "storageProfile.dataDisks[?name=='$disk'] | length(@)" -o tsv | grep -q "^1$"
}

create_rule_if_missing() {
  local rg="$1" nsg="$2" name="$3" port="$4" prio="$5" sources="${6:-*}"
  if exists_rule "$rg" "$nsg" "$name"; then
    echo "✅ NSG rule '$name' exists"
  else
    echo "🔐 Creating NSG rule '$name' (port $port, sources ${sources})"
    if [[ "$sources" == "*" ]]; then
      az network nsg rule create -g "$rg" --nsg-name "$nsg" -n "$name" \
        --protocol Tcp --priority "$prio" --destination-port-range "$port" --access Allow --output none
    else
      az network nsg rule create -g "$rg" --nsg-name "$nsg" -n "$name" \
        --protocol Tcp --priority "$prio" --destination-port-range "$port" \
        --access Allow --source-address-prefixes $(echo "$sources" | tr ',' ' ') --output none
    fi
  fi
}

from pydantic import BaseModel
from typing import Any

def update_pydantic_model(target: BaseModel, source: BaseModel):
    """
    Recursively updates the attributes of the target Pydantic model instance
    with the values from the source instance.

    Parameters:
    - target: The instance to be updated.
    - source: The instance from which to copy the values.
    """
    for field_name in source.__fields__:
        source_value = getattr(source, field_name)
        target_value = getattr(target, field_name, None)

        if isinstance(source_value, BaseModel):
            if target_value is None:
                setattr(target, field_name, source_value)
            else:
                update_pydantic_model(target_value, source_value)
        elif isinstance(source_value, list):
            if target_value is None:
                setattr(target, field_name, source_value)
            else:
                update_list(target_value, source_value)
        elif isinstance(source_value, dict):
            if target_value is None:
                setattr(target, field_name, source_value)
            else:
                update_dict(target_value, source_value)
        else:
            setattr(target, field_name, source_value)

def update_list(target_list: list, source_list: list):
    """
    Updates a target list with values from a source list, handling nested Pydantic models.

    Parameters:
    - target_list: The list to be updated.
    - source_list: The list from which to copy the values.
    """
    min_len = min(len(target_list), len(source_list))
    for i in range(min_len):
        target_item = target_list[i]
        source_item = source_list[i]
        if isinstance(source_item, BaseModel):
            update_pydantic_model(target_item, source_item)
        elif isinstance(source_item, list):
            update_list(target_item, source_item)
        elif isinstance(source_item, dict):
            update_dict(target_item, source_item)
        else:
            target_list[i] = source_item
    # If source list is longer, append the extra items
    if len(source_list) > len(target_list):
        for i in range(len(target_list), len(source_list)):
            target_list.append(source_list[i])
    # If target list is longer, remove the extra items
    elif len(target_list) > len(source_list):
        del target_list[len(source_list):]

def update_dict(target_dict: dict, source_dict: dict):
    """
    Updates a target dictionary with values from a source dictionary, handling nested Pydantic models.

    Parameters:
    - target_dict: The dictionary to be updated.
    - source_dict: The dictionary from which to copy the values.
    """
    for key in source_dict:
        source_value = source_dict[key]
        target_value = target_dict.get(key)
        if isinstance(source_value, BaseModel):
            if target_value is None:
                target_dict[key] = source_value
            else:
                update_pydantic_model(target_value, source_value)
        elif isinstance(source_value, list):
            if target_value is None:
                target_dict[key] = source_value
            else:
                update_list(target_value, source_value)
        elif isinstance(source_value, dict):
            if target_value is None:
                target_dict[key] = source_value
            else:
                update_dict(target_value, source_value)
        else:
            target_dict[key] = source_value
    # Remove keys not present in source_dict
    keys_to_remove = set(target_dict.keys()) - set(source_dict.keys())
    for key in keys_to_remove:
        del target_dict[key]

const Region = require("../models/region.model");

const checkRegionValidation = async (
  stateName,
  zoneName,
  districtName,
  blockName
) => {
  const state = await Region.findOne({ state: stateName });
  if (!state) {
    return { error: true, message: "State not found!" };
  }
  let zone = state.zones.find((zones) => zones.name === zoneName);
  if (!zone) {
    return { error: true, message: "Zone not found!" };
  }
  zone = zone.toObject();
  const district = zone.districts.find(
    (district) => district.name === districtName
  );
  if (!district) {
    return { error: true, message: "District not found!" };
  }
  const block = district.blocks.find((block) => block.name === blockName);
  if (!block) {
    return { error: true, message: "Taluk not found!" };
  }
  return { error: false, message: " Data validated!" };
};

module.exports = checkRegionValidation;

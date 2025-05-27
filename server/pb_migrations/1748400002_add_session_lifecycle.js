/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3660498186");

  // add status field
  collection.fields.push({
    "hidden": false,
    "id": "text1234567892",
    "maxSize": 0,
    "minSize": 0,
    "name": "status",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  });

  // add currentTurn field
  collection.fields.push({
    "hidden": false,
    "id": "number1234567893",
    "max": null,
    "min": null,
    "name": "currentTurn",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  });

  // add pausedAt field
  collection.fields.push({
    "hidden": false,
    "id": "date1234567894",
    "max": "",
    "min": "",
    "name": "pausedAt",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3660498186");
  
  // remove fields
  const fieldsToRemove = ["status", "currentTurn", "pausedAt"];
  fieldsToRemove.forEach(fieldName => {
    const field = collection.fields.find(f => f.name === fieldName);
    if (field) {
      const index = collection.fields.indexOf(field);
      collection.fields.splice(index, 1);
    }
  });

  return app.save(collection);
})
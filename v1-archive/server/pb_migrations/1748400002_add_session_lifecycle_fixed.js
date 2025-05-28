/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3660498186");

  // add status field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "text" + Date.now(),
    "name": "status",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "text"
  }));

  // add currentTurn field
  collection.fields.addAt(9, new Field({
    "hidden": false,
    "id": "number" + (Date.now() + 1),
    "max": null,
    "min": null,
    "name": "currentTurn",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  // add pausedAt field
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "date" + (Date.now() + 2),
    "name": "pausedAt",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3660498186");
  
  // remove fields
  collection.fields.removeByName("status");
  collection.fields.removeByName("currentTurn");
  collection.fields.removeByName("pausedAt");

  return app.save(collection);
})
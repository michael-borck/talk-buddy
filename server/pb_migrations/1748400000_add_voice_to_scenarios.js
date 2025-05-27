/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4145231549");

  // add voice field
  collection.fields.push({
    "hidden": false,
    "id": "text1234567890",
    "maxSize": 0,
    "minSize": 0,
    "name": "voice",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4145231549");
  
  // remove voice field
  const field = collection.fields.find(f => f.name === "voice");
  if (field) {
    const index = collection.fields.indexOf(field);
    collection.fields.splice(index, 1);
  }

  return app.save(collection);
})
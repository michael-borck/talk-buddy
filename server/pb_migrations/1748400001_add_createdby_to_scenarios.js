/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4145231549");

  // add createdBy field (relation to users)
  collection.fields.push({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "hidden": false,
    "id": "relation1234567890",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "createdBy",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  });

  // add isPublic field to control visibility
  collection.fields.push({
    "hidden": false,
    "id": "bool1234567891",
    "name": "isPublic",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4145231549");
  
  // remove fields
  const fieldsToRemove = ["createdBy", "isPublic"];
  fieldsToRemove.forEach(fieldName => {
    const field = collection.fields.find(f => f.name === fieldName);
    if (field) {
      const index = collection.fields.indexOf(field);
      collection.fields.splice(index, 1);
    }
  });

  return app.save(collection);
})
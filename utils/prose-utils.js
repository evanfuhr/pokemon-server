var async = require('async');
var _ = require('lodash');

let knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: './db/pokedex.db'
  }
});
var queries = require('../db/queries.json');

var utils = {
  cleanProse:function(prose, objectId) {
    var regex = /(\[(|[A-Za-z\s]+)\]\{([a-z:\-\s]+)\}|\$effect_chance)/g;
    var rawItems = prose.match(regex);
    var newProse = prose;
    var item;
    var itemType;
    async.series(
      [
        function translateItem(callback2) {
          async.eachSeries(rawItems, function(rawItem, outerCallback3) {
            async.series([
              function determineItemType(callback3) {
                itemType = rawItem.substring(rawItem.indexOf('{') + 1, rawItem.indexOf(':'));
                // If itemType is empty, all that remains is 'effectChance'
                itemType = itemType != '' ? itemType : 'effectChance';
                item = '[TODO: finish short effect cleaner]';
                callback3();
              },
              function getItemName(callback3) {
                if (rawItem.indexOf("]") > 1) {
                    item = rawItem.substring(1, rawItem.indexOf("]"));
                    callback3();
                } else {
                    switch (itemType) {
                    case 'ability':
                        knex.raw(queries.ability.getByIdentifier, [rawItem, local_language_id])
                        .then( function (ability) {
                        item = ability[0];
                        callback3();
                        });
                        break;
                    case 'effectChance':
                        knex.raw(queries.move.getMeta, [objectId])
                        .then( function (chances) {
                        for (const key of Object.keys(chances[0])) {
                            if (key != 'id' && key != 'crit_rate') {
                                if (chances[0][key] != 0) {
                                    item = chances[0][key];
                                    callback3();
                                }
                            }
                        }
                        });
                        break;
                    default:
                        console.log('Prose reference object type not recognized');
                        item = rawItem;
                        callback3();
                        break;
                    }
                }
              },
              function replaceShortEffect(callback3) {
                newProse = newProse.replace(rawItem, item);
                prose = newProse;
                callback3();
              }
            ], function (err) {
              outerCallback3(err);
            })
          }, function (err) {
            callback2(err);
          })
        }
      ], function (err) {
        return(prose);
      }
    );
  }
};

module.exports = utils;
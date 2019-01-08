let sqlite3 = require('sqlite3').verbose();
var async = require('async');
var _ = require('lodash');
var proseUtils = require('../utils/prose-utils');

let knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: './db/pokedex.db'
  }
});

var express = require('express');
var router = express.Router();

var queries = require('../db/queries.json');

/* GET a list of all moves */
router.get('/', function(req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  console.log('Received /move request');

  var local_language_id = 9; // English

  knex.raw(queries.get.moves, [local_language_id])
    .then( function (moves) {
      console.log('Returned /move response');
      res.json(moves);
    });
});

router.get('/:id', function(req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  console.log('Received /move/' + req.params.id + ' request');

  var move = {
    id: req.params.id
  };
  var pokemons;
  var pokemonTypes;
  var typedPokemons = [];
  var local_language_id = 9; // English
  var version_group_id = 18; // USUM

  async.series(
    [
      function getMove(callback) {
        knex.raw(queries.move.get, [move.id, local_language_id, local_language_id])
            .then( function (rawMove) {
                move = rawMove[0];
                callback();
            });
      },
      function cleanShortEffect(callback) {
        var regex = /(\[(|[A-Za-z\s]+)\]\{([a-z:\-\s]+)\}|\$effect_chance)/g;
        var rawItems = move.short_effect.match(regex);
        var newMoveShortEffect = move.short_effect;
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
                            knex.raw(queries.move.getMeta, [move.id])
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
                    newMoveShortEffect = newMoveShortEffect.replace(rawItem, item);
                    move.short_effect = newMoveShortEffect;
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
            // Done adding typed pokemon to move
            callback(err);
          }
        );
      },
      function addType(callback) {
        knex.raw(queries.move.getType, [move.id, local_language_id])
            .then( function (type) {
              move.type = type;
              callback();
            });
      },
      function addPokemon(callback) {
        async.series(
          [
            function getPokemons(callback2) {
              knex.raw(queries.move.getPokemon, [move.id, version_group_id, local_language_id])
                  .then( function (rawPokemons) {
                    pokemons = rawPokemons;
                    callback2();
                  });
            },
            function getTypes(callback2) {
              async.eachSeries(pokemons, function(untyped_pokemon, outerCallback3) {
                async.series([
                  function(callback3) {
                    knex.raw(queries.pokemon.getTypes, [untyped_pokemon.id, local_language_id])
                        .then( function (types) {
                          pokemonTypes = types;
                          callback3();
                        });
                  },
                  function addTypesToPokemon(callback3) {
                    var typedPokemon = untyped_pokemon;
                    typedPokemon.types = pokemonTypes;
                    typedPokemons.push(typedPokemon);
                    callback3();
                  }
                ], function (err) {
                  outerCallback3(err);
                })
              }, function (err) {
                callback2(err);
              })
            },
            function addPokemonToType(callback2) {
              move.pokemon = typedPokemons;
              callback2();
            }
          ], function (err) {
            // Done adding typed pokemon to move
            callback(err);
          }
        );
      },
      function returnMove(callback) {
        console.log('Returned /move/' + req.params.id + ' response');
        res.json(move);
        callback();
      }
    ]
  );
});

module.exports = router;

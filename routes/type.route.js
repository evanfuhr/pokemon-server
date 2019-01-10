let sqlite3 = require('sqlite3').verbose();
var async = require('async');
var _ = require('lodash');

let knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: './db/pokedex.db'
  },
  useNullAsDefault: true
});

var express = require('express');
var router = express.Router();

var queries = require('../db/queries.json');

/* GET a list of all types */
router.get('/', function(req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  console.log('Received /type request');

  var local_language_id = 9; // English

  knex.raw(queries.get.types, [local_language_id])
    .then( function (types) {
      console.log('Returned /type response');
      res.json(types);
    });
});

router.get('/:id', function(req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  console.log('Received /type/' + req.params.id + ' request');

  var type = {
    id: req.params.id
  };
  var pokemons;
  var pokemonTypes;
  var typedPokemons = [];
  var local_language_id = 9; // English

  async.series(
    [
      function getType(callback) {
        knex.raw(queries.type.get, [type.id, local_language_id])
            .then( function (rawType) {
              type = rawType[0];
              callback();
            });
      },
      function addTypeMatchUps(callback) {
        knex.raw(queries.type.getTypeMatchUps, [type.id, type.id, local_language_id, local_language_id])
            .then( function (matchUps) {
              type.matchUps = matchUps;
              callback();
            });
      },
      function addPokemon(callback) {
        async.series(
          [
            function getPokemons(callback2) {
              knex.raw(queries.type.getPokemon, [type.id, local_language_id])
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
              type.pokemon = typedPokemons;
              callback2();
            }
          ], function (err) {
            // Done adding typed pokemon to type
            callback(err);
          }
        );
      },
      function addMoves(callback) {
        knex.raw(queries.type.getMoves, [type.id, local_language_id])
            .then( function (moves) {
              type.moves = moves;
              callback();
            });
      },
      function returnType(callback) {
        console.log('Returned /type/' + req.params.id + ' response');
        res.json(type);
        callback();
      }
    ]
  );
});

module.exports = router;

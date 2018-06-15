let sqlite3 = require('sqlite3').verbose();
var async = require('async');
var _ = require('lodash');

let knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: './db/pokedex.db'
  }
});

var express = require('express');
var router = express.Router();

var queries = require('../db/queries.json');

/* GET a list of all pokemon */
router.get('/', function(req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  console.log('Received /pokemon request');

  var pokemons;
  var pokemonTypes;
  var typedPokemons = [];

  async.series(
    [
      function getPokemons(callback) {
        knex.raw(queries.get.pokemon, [9])
            .then( function (rawPokemons) {
              pokemons = rawPokemons;
              callback();
            });
      },
      function get_types(callback) {
        async.eachSeries(pokemons, function(untyped_pokemon, outerCallback2) {
          async.series([
            function(callback2) {
              knex.raw(queries.pokemon.getTypes, [untyped_pokemon.id])
                  .then( function (types) {
                    pokemonTypes = types;
                    callback2();
                  });
            },
            function add_types_to_pokemon(callback2) {
              var typedPokemon = untyped_pokemon;
              typedPokemon.types = pokemonTypes;
              typedPokemons.push(typedPokemon);
              callback2();
            }
          ], function (err) {
            outerCallback2(err);
          })
        }, function (err) {
          callback(err);
        })
      },
      function returnData(callback) {
        console.log('Returned /pokemon response');
        res.json(typedPokemons);
        callback();
      }
    ]
  );
});

router.get('/:id', function(req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  console.log('Received /pokemon/' + req.params.id + ' request');

  var pokemon = {
    id: req.params.id
  };

  async.series(
    [
      function getPokemon(callback) {
        knex.raw(queries.pokemon.get, [pokemon.id, 9])
            .then( function (rawPokemon) {
              pokemon = rawPokemon[0];
              callback();
            });
      },
      function addTypes(callback) {
        knex.raw(queries.pokemon.getTypes, [pokemon.id])
            .then( function (types) {
              pokemon.types = types;
              callback();
            });
      },
      function addAbilities(callback) {
        knex.raw(queries.pokemon.getAbilities, [pokemon.id])
            .then( function (abilities) {
              pokemon.abilities = abilities;
              callback();
            });
      },
      function returnPokemon(callback) {
        console.log('Returned /pokemon/' + req.params.id + ' response');
        res.json(pokemon);
        callback();
      }
    ]
  );
});

module.exports = router;

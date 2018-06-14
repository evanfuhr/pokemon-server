let sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('./db/pokedex.db');
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

/* GET a list of all pokemon */
router.get('/', function(req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  console.log('Received /pokemon request');

  var pokemons;
  var pokemon_types;
  var typedPokemons = [];

  async.series(
    [
      function get_pokemon(callback) {
        knex.join('pokemon_species_names', 'pokemon_species_names.pokemon_species_id', 'pokemon_species.id')
            .select('pokemon_species.id', 'pokemon_species_names.name')
            .from('pokemon_species')
            .where('pokemon_species_names.local_language_id', 9)
            .then( function (rawPokemons) {
              return rawPokemons;
            }).then( function (rawPokemons) {
              pokemons = rawPokemons;
              callback();
            });
      },
      function get_types(callback) {
        async.eachSeries(pokemons, function(untyped_pokemon, outerCallback2) {
          console.log('Typing pokemon: ' + untyped_pokemon.id);
          async.series([
            function(callback2) {
              knex.select('pokemon_types.type_id', 'pokemon_types.slot')
                  .from('pokemon_types')
                  .where('pokemon_types.pokemon_id', untyped_pokemon.id)
                  .then( function (types) {
                    return types;
                  })
                  .then( function (types) {
                    pokemon_types = types;
                    callback2();
                  })
            },
            function add_types_to_pokemon(callback2) {
              var typed_pokemon = untyped_pokemon;
              typed_pokemon.types = pokemon_types;
              typedPokemons.push(typed_pokemon);
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

module.exports = router;

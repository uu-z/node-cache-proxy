const Mhr = require("menhera").default;
const mongoose = require("mongoose");
const { composeWithMongoose } = require("graphql-compose-mongoose/node8");
const { schemaComposer, Resolver } = require("graphql-compose");
const _ = require("lodash");
const graphqlHTTP = require("koa-graphql");
const koaPlayground = require("graphql-playground-middleware-koa").default;
const { utils } = require("../packages/core/utils");

const {
  GRAPHQL: {
    genSchemaFromMongoose = true,
    defaultSchema = {
      Query: ["findById", "findByIds", "findOne", "findMany", "count", "connection", "pagination"],
      Mutation: [
        "createOne",
        "createMany",
        "updateById",
        "updateOne",
        "updateMany",
        "removeById",
        "removeOne",
        "removeMany"
      ]
    }
  }
} = _.get(Mhr, "config", {});

module.exports = {
  name: "Graphql",
  $graphql: utils.injectObjectDeep("graphql"),
  $gql: {
    $({ _key: kind, _val }) {
      _.each(_val, (v, k) => {
        const key = `graphqlSchmas.${k}`;
        const target = _.get(Mhr, key, {});
        _.set(Mhr, key, { kind, ...target, ...v, resolver: new Resolver({ name: k, ...v }) });
      });
    }
  },
  $start: {
    router() {
      if (genSchemaFromMongoose) {
        this.genSchemaFromMongoose();
      }
      Mhr.$use({ graphqlSchmas: _.get(Mhr, "graphqlSchmas") });

      const graphqlSchmas = _.get(Mhr, "graphqlSchmas", {});
      _.each(_.omitBy(graphqlSchmas, _.isUndefined), (val, key) => {
        schemaComposer[val.kind].addFields({ [key]: val.resolver });
      });

      if (schemaComposer.size > 0) {
        console.success("graphql start~~~");
        Mhr.$use({
          routes: {
            "all /graphql": graphqlHTTP({ schema: schemaComposer.buildSchema() }),
            "all /playground": koaPlayground({ endpoint: "/graphql" })
          }
        });
      }
      // console.log(graphqlSchmas);
      _.set(Mhr, "graphqlSchmas", undefined); // remove schemas after finished to reduce memory size
    }
  },
  genSchemaFromMongoose() {
    let types = {};
    _.each(mongoose.models, (val, model) => {
      let options = {
        fields: {
          remove: ["password"]
        }
      };

      types[model] = composeWithMongoose(val, options);

      _.each(defaultSchema, (val, kind) => {
        val.forEach(field => {
          const fieldName = `${model}${_.upperFirst(field)}`;
          const resolver = types[model].getResolver(field);
          Mhr.$use({
            gql: {
              [kind]: {
                [fieldName]: {
                  model,
                  kind,
                  field,
                  resolver
                }
              }
            }
          });
        });
      });
    });
    _.each(mongoose.models, (val, model) => {
      const schemaObj = _.get(val, "schema.obj", {});
      _.each(schemaObj, (val, key) => {
        if (val.ref) {
          const resolver = types[val.ref].getResolver("findOne");
          types[model].addRelation(key, {
            resolver,
            prepareArgs: {
              filter: source => ({
                _id: source[key]
              })
            },
            projection: { [key]: true }
          });
        }
      });
    });
  }
};
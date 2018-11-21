const _ = require("lodash");
const jwt = require("jsonwebtoken");
const monngose = require("mongoose");
const requireDir = require("require-dir");
const path = require("path");

const utils = {
  name: "utils",
  utils: {
    // Token
    signJWT({ data }) {
      const { JWT_EXP, JWT_SECRET } = Mhr.config;
      return jwt.sign({ data, exp: JWT_EXP }, JWT_SECRET);
    },
    // Model
    convertParams(name, values) {
      const model = monngose.models[name];
      return _.pick(values, _.keys(model.schema));
    },
    model(name) {
      return monngose.models[name];
    },
    create(name, params) {
      const model = monngose.models[name];
      return model.create(params);
    },
    findOne(name, params) {
      const model = monngose.models[name];
      return model.findOne(params);
    },
    updateOne(name, query, values) {
      const data = utils.convertParams(name, values);
      const model = monngose.models[name];
      return model.updateOne(query, data);
    },
    paginate(name, query, paginate) {
      const model = monngose.models[name];
      return model.paginate(query, paginate);
    },
    // Utils
    injectObject(name) {
      return {
        _({ _val }) {
          let target = _.get(Mhr, name, {});
          _.set(Mhr, name, { ...target, ..._val });
        }
      };
    },
    injectArray(name) {
      return {
        _({ _val }) {
          let target = _.get(Mhr, name, []);
          _.set(Mhr, name, [...target, ..._val]);
        }
      };
    },
    load(dir) {
      return {
        _mount: _.values(
          requireDir(path.join(process.cwd(), dir), {
            filter(file) {
              const basename = path.basename(file);
              return !basename.startsWith(".");
            },
            mapValue(v, b) {
              return v.name || v.load == false ? v : {};
            }
          })
        )
      };
    }
  }
};

module.exports = utils;

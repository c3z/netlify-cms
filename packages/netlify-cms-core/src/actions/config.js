import yaml from 'js-yaml';
import { Map, fromJS } from 'immutable';
import { trimStart, get, cloneDeep, omit } from 'lodash';
import { authenticateUser } from 'Actions/auth';
import * as publishModes from 'Constants/publishModes';
import { validateConfig } from 'Constants/configSchema';
import { selectIdentifier } from 'Reducers/collections';

export const CONFIG_REQUEST = 'CONFIG_REQUEST';
export const CONFIG_SUCCESS = 'CONFIG_SUCCESS';
export const CONFIG_FAILURE = 'CONFIG_FAILURE';
export const CONFIG_MERGE = 'CONFIG_MERGE';

const getConfigUrl = () => {
  const validTypes = { 'text/yaml': 'yaml', 'application/x-yaml': 'yaml' };
  const configLinkEl = document.querySelector('link[rel="cms-config-url"]');
  const isValidLink = configLinkEl && validTypes[configLinkEl.type] && get(configLinkEl, 'href');
  if (isValidLink) {
    const link = get(configLinkEl, 'href');
    console.log(`Using config file path: "${link}"`);
    return link;
  }
  return 'config.yml';
};

const defaults = {
  publish_mode: publishModes.SIMPLE,
};

export function applyDefaults(config) {
  return Map(defaults)
    .mergeDeep(config)
    .withMutations(map => {
      // Use `site_url` as default `display_url`.
      if (!map.get('display_url') && map.get('site_url')) {
        map.set('display_url', map.get('site_url'));
      }

      // Use media_folder as default public_folder.
      const defaultPublicFolder = `/${trimStart(map.get('media_folder'), '/')}`;
      if (!map.get('public_folder')) {
        map.set('public_folder', defaultPublicFolder);
      }

      // default values for the slug config
      if (!map.getIn(['slug', 'encoding'])) {
        map.setIn(['slug', 'encoding'], 'unicode');
      }

      if (!map.getIn(['slug', 'clean_accents'])) {
        map.setIn(['slug', 'clean_accents'], false);
      }

      if (!map.getIn(['slug', 'sanitize_replacement'])) {
        map.setIn(['slug', 'sanitize_replacement'], '-');
      }

      const langs = map.get('languages');
      // Strip leading slash from collection folders and files
      map.set(
        'collections',
        map.get('collections').map(collection => {
          const folder = collection.get('folder');
          if (folder) {
            if (collection.has('path') && !collection.has('media_folder')) {
              // default value for media folder when using the path config
              collection = collection.set('media_folder', '');
            }

            const fields = collection.get('fields');
            if (langs && fields) {
              // add languague fields
              collection = collection.set(
                'fields',
                fromJS(
                  addLanguageFields(fields.toJS(), langs.toJS(), selectIdentifier(collection)),
                ),
              );
            }

            return collection.set('folder', trimStart(folder, '/'));
          }

          const files = collection.get('files');
          if (files) {
            return collection.set(
              'files',
              files.map(file => {
                return file.set('file', trimStart(file.get('file'), '/'));
              }),
            );
          }
        }),
      );
    });
}

export function addLanguageFields(fields, langs, identifier) {
  return fields.reduce((acc, item) => {
    const name = item.name;
    // exclude identifier and body fields
    if (item.translate && name !== identifier && name !== 'body') {
      const langFields = langs.map(lang => {
        return { ...omit(cloneDeep(item), 'translate'), label: lang.toUpperCase(), name: lang };
      });
      const newField = { ...omit(item, 'translate'), widget: 'object', fields: langFields };
      return [...acc, newField];
    }

    return [...acc, item];
  }, []);
}

function mergePreloadedConfig(preloadedConfig, loadedConfig) {
  const map = fromJS(loadedConfig) || Map();
  return preloadedConfig ? preloadedConfig.mergeDeep(map) : map;
}

function parseConfig(data) {
  const config = yaml.safeLoad(data);
  if (typeof CMS_ENV === 'string' && config[CMS_ENV]) {
    Object.keys(config[CMS_ENV]).forEach(key => {
      config[key] = config[CMS_ENV][key];
    });
  }
  return config;
}

async function getConfig(file, isPreloaded) {
  const response = await fetch(file, { credentials: 'same-origin' }).catch(err => err);
  if (response instanceof Error || response.status !== 200) {
    if (isPreloaded) return parseConfig('');
    throw new Error(`Failed to load config.yml (${response.status || response})`);
  }
  const contentType = response.headers.get('Content-Type') || 'Not-Found';
  const isYaml = contentType.indexOf('yaml') !== -1;
  if (!isYaml) {
    console.log(`Response for ${file} was not yaml. (Content-Type: ${contentType})`);
    if (isPreloaded) return parseConfig('');
  }
  return parseConfig(await response.text());
}

export function configLoaded(config) {
  return {
    type: CONFIG_SUCCESS,
    payload: config,
  };
}

export function configLoading() {
  return {
    type: CONFIG_REQUEST,
  };
}

export function configFailed(err) {
  return {
    type: CONFIG_FAILURE,
    error: 'Error loading config',
    payload: err,
  };
}

export function configDidLoad(config) {
  return dispatch => {
    dispatch(configLoaded(config));
  };
}

export function mergeConfig(config) {
  return { type: CONFIG_MERGE, payload: config };
}

export function loadConfig() {
  if (window.CMS_CONFIG) {
    return configDidLoad(fromJS(window.CMS_CONFIG));
  }
  return async (dispatch, getState) => {
    dispatch(configLoading());

    try {
      const preloadedConfig = getState().config;
      const configUrl = getConfigUrl();
      const loadedConfig =
        preloadedConfig && preloadedConfig.get('load_config_file') === false
          ? {}
          : await getConfig(configUrl, preloadedConfig && preloadedConfig.size > 1);

      /**
       * Merge any existing configuration so the result can be validated.
       */
      const mergedConfig = mergePreloadedConfig(preloadedConfig, loadedConfig);
      validateConfig(mergedConfig.toJS());

      const config = applyDefaults(mergedConfig);

      dispatch(configDidLoad(config));
      dispatch(authenticateUser());
    } catch (err) {
      dispatch(configFailed(err));
      throw err;
    }
  };
}

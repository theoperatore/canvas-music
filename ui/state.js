'use strict';

import { combineReducers, createStore } from 'redux';

function points(state = [], action) {
  switch(action.type) {
    case 'ADD_POINT':
      return [ ...state, action.point ];
    default:
      return state;
  }
}

function paths(state = [], action) {
  switch(action.type) {
    case 'END_PATH':
      return [ ...state, action.path];
    case 'CLEAR_PATHS':
      return [];
    default:
      return state;
  }
}

function currentPath(state = {}, action) {
  switch(action.type) {
    case 'START_PATH':
      return action.path;
    case 'ADD_POINT':
      return Object.assign({}, state, {
        points: points(state.points, action)
      });
    case 'END_PATH':
      return {};
    case 'CLEAR_PATHS':
      return {};
    default:
      return state;
  }
}

export default createStore(combineReducers({ 
  currentPath, 
  paths,
}));
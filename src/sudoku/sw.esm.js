import {initSw} from "../assets/js/base-sw.js";

const CACHE_TAG = `sudoku-cache`;
const version = 'v1';
// 需要预缓存的所有资源
const PRECACHE_URLS = [
  './index.html',
  './manifest.json',
  '../assets/css/common.css',
  '../assets/js/sudoku.js',
  '../assets/images/sudoku.png',
];

initSw(CACHE_TAG, PRECACHE_URLS, version);

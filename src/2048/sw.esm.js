import {initSw} from "../assets/js/base-sw.js";

const CACHE_TAG = `2048-cache`;
const version = 'v1';
// 需要预缓存的所有资源
const PRECACHE_URLS = [
  './index.html',
  './manifest.json',
  '../assets/css/common.css',
  '../assets/js/2048.js',
  '../assets/images/2048.png',
];

initSw(CACHE_TAG, PRECACHE_URLS, version);
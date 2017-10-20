const angular = require('angular');
require('angular-route');
const glazeCalcApp = angular.module('glazeCalcApp', ['ngRoute']);

require('./services')(glazeCalcApp);

require('./auth')(glazeCalcApp);
require('./additive')(glazeCalcApp);
require('./advice')(glazeCalcApp);
require('./firing')(glazeCalcApp);
require('./home')(glazeCalcApp);
require('./material')(glazeCalcApp);
require('./notes')(glazeCalcApp);
require('./recipe')(glazeCalcApp);
require('./reset')(glazeCalcApp);
require('./services')(glazeCalcApp);
require('./trash')(glazeCalcApp);

glazeCalcApp.config(['$routeProvider', function(routes) {
  routes
    .when('/home', {
      controller: 'HomeController',
      templateUrl: '/views/home_view.html'
    })
    .when('/signup', {
      controller: 'SignupController',
      templateUrl: '/views/sign_up_in_view.html'
    })
    .when('/signin', {
      controller: 'SigninController',
      templateUrl: '/views/sign_up_in_view.html'
    })
    .when('/firing', {
      controller: 'FiringController',
      templateUrl: '/views/firing_view.html'
    })
    .when('/recipe', {
      controller: 'RecipeController',
      templateUrl: '/views/recipe_view.html'
    })
    .when('/additive', {
      controller: 'AdditiveController',
      templateUrl: '/views/additive_view.html'
    })
    .when('/advice', {
      controller: 'AdviceController',
      templateUrl: '/views/advice_view.html'
    })
    .when('/trash', {
      controller: 'TrashController',
      templateUrl: '/views/trash_view.html'
    })
    .when('/material', {
      controller: 'MaterialController',
      templateUrl: '/views/material_view.html'
    })
    .when('/notes', {
      controller: 'NotesController',
      templateUrl: '/views/notes_view.html'
    })
    .when('/reset', {
      controller: 'ResetController',
      templateUrl: '/views/reset_view.html'
    })
    .when('/', {
      redirectTo: '/signin'
    })
    .otherwise({
      templateUrl: '/views/404.html'
    });
}]);

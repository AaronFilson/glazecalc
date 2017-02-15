const angular = require('angular');
require('angular-route');
const glazeCalcApp = angular.module('glazeCalcApp', ['ngRoute']);

require('./advice')(glazeCalcApp);
require('./auth')(glazeCalcApp);
require('./firing')(glazeCalcApp);
require('./material')(glazeCalcApp);
require('./notes')(glazeCalcApp);
require('./recipe')(glazeCalcApp);
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
    .when('/', {
      redirectTo: '/signin'
    })
    .otherwise({
      templateUrl: '/views/404.html'
    });
}]);

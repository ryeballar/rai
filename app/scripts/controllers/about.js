'use strict';

/**
 * @ngdoc function
 * @name raiApp.controller:AboutCtrl
 * @description
 * # AboutCtrl
 * Controller of the raiApp
 */
angular.module('raiApp')
  .controller('AboutCtrl', function ($scope) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
  });

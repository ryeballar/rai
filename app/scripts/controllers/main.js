'use strict';

/**
 * @ngdoc function
 * @name raiApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the raiApp
 */
angular.module('raiApp')
  .controller('MainCtrl', function ($scope) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
  });

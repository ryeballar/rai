'use strict';

angular.module('app', [
	'ngAnimate',
	'ngCookies',
	'ngResource',
	'ngRoute',
	'ngSanitize',
	'ngTouch'
])

.factory('objectStringInterpolator', function() {
	return function(object) {
		var newObject = angular.copy(object),
			rawMatch, match, matches;

		angular.forEach(newObject, function(string, index) {
			matches = string.match(/{{.*?}}/g) || [];
			while(matches.length > 0) {
				rawMatch = matches.pop();
				match = rawMatch.substring(2, rawMatch.length - 2);

				if(newObject[match]) {
					string = string.replace(new RegExp(rawMatch, 'g'), newObject[match]);
				}
			}
			newObject[index] = string;
		});



		return newObject;
	};
})

.factory('delayEval', function() {
	return function(scope, expPre, expPost) {
		scope.$eval(expPre);
		$timeout(function() {
			scope.$eval(expPost);
		});
	}
})

.run(function(objectStringInterpolator) {

	var object = {
		HOST: 'www.whatever.com',
		API: '{{HOST}}/api/v1',
		USER: '{{API}}/users',
		ME: '{{USER}}/me'
	};

	console.log(objectStringInterpolator(object));

})

.controller('Ctrl', function($scope, $timeout) {

	var emails = [
		'ryeballar@gmail.com',
		'charmhaze21@gmail.com',
		'rjwapow@yahoo.com'
	];

	$scope.user = {};

	$scope.isEmailDuplicate = false;
	
	$scope.submit = function() {
		var isEmailDuplicate = emails.indexOf($scope.user.emailAddress) >= 0;
		$scope.isEmailDuplicate = !isEmailDuplicate;
		$timeout(function() {
			$scope.isEmailDuplicate = isEmailDuplicate;
		});
	};
})

.provider('raiError', function() {

	var errors = {};

	this.hasPropertyValue = function() {
		var args = arguments;
		return function(attr) {
			var hasFound = false;
			angular.forEach(args, function(object) {
				angular.forEach(object, function(value, property) {
					hasFound = hasFound || attr[property] === value;
				});
			});
			return hasFound;
		};
	};

	this.hasProperty = function() {
		var args = arguments;
		return function(attr) {
			var hasFound = false;
			angular.forEach(args, function(property) {
				hasFound = hasFound || angular.isDefined(attr[property]);
			});
			return hasFound;
		};
	};

	this.addError = function(errorName, errorValue, evaluator) {
		errors[errorName] = {
			value: errorValue,
			evaluator: evaluator
		};
		return this;
	};

	this.$get = /* @ngInject */ function($interpolate) {
		return {
			errors: errors,
			setProperties: function(properties, attr) {
				angular.forEach(errors, function(error, errorName) {
					if(error.evaluator(attr)) {
						if(/{{.*}}/g.test(error.value)) {
							properties[errorName] = $interpolate(error.value)(attr);
						} else {
							properties[errorName] = error.value;
						}
					}
				});
			}
		};
	};

})

.config(function(raiErrorProvider) {

	raiErrorProvider
		.addError('email', 'This field must be an E-mail Address', raiErrorProvider.hasPropertyValue({type: 'email'}))
		.addError('required', 'This field is required', raiErrorProvider.hasProperty('ngRequired', 'required'))
		.addError('minlength', 'This field must be at least {{ngMinlength}} characters', raiErrorProvider.hasProperty('ngMinlength'))
		.addError('maxlength', 'This field cannot exceed {{ngMaxlength}} characters', raiErrorProvider.hasProperty('ngMaxlength'))
		.addError('min', 'This field must be at least {{min}}', raiErrorProvider.hasProperty('min'))
		.addError('min', 'This field must be at least {{max}}', raiErrorProvider.hasProperty('max'))
		.addError('pattern', 'This field is invalid', raiErrorProvider.hasProperty('ngPattern'))
		.addError('raiDuplicateEmail', 'This E-mail Address is already in use', raiErrorProvider.hasProperty('raiDuplicateEmail'))
		.addError('raiDuplicateicateUsername', 'This username is already in use', raiErrorProvider.hasProperty('raiDuplicateEmail'))
		.addError('raiMatchPassword', 'The password does not match', raiErrorProvider.hasProperty('raiMatchPassword'));

})

.service('raiFormService', function() {
	this.setGlobalState = function setGlobalState(controller, stateName, state) {
		if(angular.isDefined(controller.$name)) {
			controller[stateName] = state;
			angular.forEach(controller, function(item) {
				if(item) {
					setGlobalState(item, stateName, state);
				}
			});
		}
	};
})

.directive('raiForm', function(raiFormService, $window, $timeout) {

	return {
		require: 'form',
		priority: -1000,
		compile: function(tElem, tAttr) {
			var elements = $window.document.querySelectorAll('[rai-input]'),
				formName = tAttr.name || 'form',
				jqlClones = [];

			tAttr.$set('novalidate', '');
			tAttr.$set('name', formName);

			angular.forEach(elements, function(element) {
				var jqlElement = angular.element(element),
					ngModel = jqlElement.attr('rai-input'),
					split = ngModel.split('.'),
					name = split[split.length-1],
					label = jqlElement.attr('label');


				if(!label) {
					var labelMatch = name.match(/(\b|[A-Z]+)[a-z]*/g);
					angular.forEach(labelMatch, function(value, index) {
						labelMatch[index] = labelMatch[index].substr(0, 1).toUpperCase() +
							labelMatch[index].substr(1);
					});
					label = labelMatch.join(' ');
				}

				var placeholder = 'Enter ' + label;

				jqlElement.attr('name', name);
				jqlElement.attr('ng-model', ngModel);
				jqlElement.attr('placeholder', placeholder);

				var formGroup = angular.element('<div>'),
					errorDiv = angular.element('<div>'),
					labelElem = angular.element('<label>'),
					jqlClone = jqlElement.clone(true),
					formField = formName + '.' + name,
					hasError = formField + '.$invalid' + 
						' && ' +
						formField + '.ACTIVE';

				jqlClones.push(jqlClone);

				labelElem.addClass('control-label');
				labelElem.html(label);
				formGroup.append(labelElem);
				formGroup.append(jqlClone);

				errorDiv.attr('ng-show', hasError);
				errorDiv.attr('rai-error', formField);
				formGroup.append(errorDiv);

				formGroup.attr('ng-class', '{\'has-error\':' + hasError + '}');

				jqlElement.replaceWith(formGroup);

			});

			elements = null;

			return function(scope, elem, attr, form) {
				elem.on('submit', function() {

					raiFormService.setGlobalState(form, 'ACTIVE', true);
					scope.$apply();

					$timeout(function() {
						var i, jqlClone;
						for(i = 0; i < jqlClones.length; i++) {
							jqlClone = jqlClones[i];
							if(jqlClone.hasClass('ng-invalid')) {
								jqlClone[0].focus();
								break;
							}
						}
					});
				});
			};
		}
	};
})

.directive('raiInput', function(raiError, $timeout) {
	return {
		require: 'ngModel',
		link: function(scope, elem, attr, ngModel) {
			var properties = ngModel.ERROR_PROPERTIES = {};

			var isDuplicate = function(validityName) {
				return function(isDuplicate) {
					ngModel.$setValidity(validityName, !isDuplicate);
				};
			};

			var stateChanges = [];

			elem.on('blur', function() {
				ngModel.ACTIVE = true;

				scope.$apply();
			});

			ngModel.$parsers.unshift(function(value) {
				ngModel.ACTIVE = false;
				angular.forEach(stateChanges, function(fn) {
					fn();
				});
				return value;
			});

			raiError.setProperties(properties, attr);

			if(angular.isDefined(attr.raiInvalidate)) {
				scope.$watch(attr.raiInvalidate, function(isInvalid) {
					if(ngModel.$valid)
						ngModel.$invalid = isInvalid;
				});
			}

			if(angular.isDefined(attr.raiDuplicateEmail)) {
				scope.$watch(attr.raiDuplicateEmail, isDuplicate('raiDuplicateEmail'));
				stateChanges.push(function() {
					ngModel.$setValidity('raiDuplicateEmail', false);
					$timeout(function() {
						ngModel.$setValidity('raiDuplicateEmail', true);
					});
				});
			}
			
			if(angular.isDefined(attr.raiDuplicateicateUsername)) {
				scope.$watch(attr.raiDuplicateUsername, isDuplicate('raiDuplicateUsername'));
				stateChanges.push(function() {
					ngModel.$setValidity('raiDuplicateicateUsername', false);
					$timeout(function() {
						ngModel.$setValidity('raiDuplicateicateUsername', true);
					});
				});
			}

			if(attr.type === 'password' && angular.isDefined(attr.raiMatchPassword)) {
				ngModel.$setValidity('raiMatchPassword', true);
				scope.$watch(attr.ngModel, function(password) {
					ngModel.$setValidity('raiMatchPassword', password == scope.$eval(attr.raiMatchPassword));
				});
			}
			
		}
	};
})

.directive('raiError', function(raiError, $interpolate) {
	return {
		scope: {
			field: '=raiError'
		},
		template: 
			'<span class="help-block" ' +
				'ng-show="field.$error[errorName]" ' + 
				'ng-repeat="(errorName, error) in field.ERROR_PROPERTIES" ' +
				'ng-bind="error">' +
			'</span>'
	};
});
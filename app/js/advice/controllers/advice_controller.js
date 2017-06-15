module.exports = function(app) {
  app.controller('AdviceController',
    ['$scope', '$http', 'gcaResource', function($scope, $http, Resource) {
      $scope.errors = [];
      $scope.serverMessages = [];
      $scope.adviceForm = {};
      $scope.editToggle = false;
      $scope.adviceData = [];
      $scope.serverAdvice = [];
      var adviceService = Resource('/advice/');

      $scope.dismissError = function(err) {
        $scope.errors.splice($scope.errors.indexOf(err), 1);
      };

      $scope.dismissMessage = function(message) {
        $scope.serverMessages.splice($scope.serverMessages.indexOf(message), 1);
      };

      $scope.getAll = function() {
        adviceService.getAll((err, data) => {
          if (err) {
            $scope.errors.push('There was an error in getting the advice information.');
            return console.log('Error: ', err);
          }
          $scope.adviceData = data;
        });
      };

      $scope.getStandard = function() {
        adviceService.getStandard((err, data) => {
          if (err) {
            $scope.errors.push('There was an error in getting the server advice information.');
            return console.log('Error: ', err);
          }
          $scope.serverAdvice = data;
        });
      };

      $scope.submit = function(adInput) {
        var advice = adInput;
        if (!advice.content || !advice.title) {
          $scope.errors.push('Error: there was missing information in the form.');
          return console.log('Error: ', advice);
        }

        if (!advice.tags) advice.tags = 'none';

        adviceService.create(advice, function(err, data) {
          if (err) {
            $scope.errors.push('There was an error in submitting the server advice information.');
            return console.log('Error: ', err);
          }
          $scope.adviceForm = {};
          $scope.adviceData.push(data);
          $scope.serverMessages.push('Success in adding to the advice records.');
        });
      };

      $scope.editMyListToggle = function() {
        $scope.editToggle = !$scope.editToggle;
      };

      $scope.removeMyAdvice = function(theAdvice) {
        adviceService.delete(theAdvice, (err) => {
          if (err) {
            $scope.errors.push('Error in deleting the advice from the server.');
            return console.log('Error: ', err);
          }
          $scope.serverMessages.push('Success in removing the advice from the server.');
        });
        $scope.adviceData.splice($scope.adviceData.indexOf(theAdvice), 1);
      };
    }]);
};

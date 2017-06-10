module.exports = function(app) {
  app.controller('AdditiveController',
    ['$scope', '$http', 'gcaResource', function($scope, $http, Resource) {

      $scope.errors = [];
      $scope.serverMessages = [];
      $scope.formula = [];
      $scope.addForm = {};
      $scope.myServerAdds = [];
      $scope.standardAdds = [];
      $scope.editToggle = false;
      var additiveService = Resource('/additives/');

      $scope.dismissError = function(err) {
        $scope.errors.splice($scope.errors.indexOf(err), 1);
      };

      $scope.dismissMessage = function(message) {
        $scope.serverMessages.splice($scope.serverMessages.indexOf(message), 1);
      };

      $scope.submit = function(additive) {
        var addCopy = additive;
        if (!addCopy || !$scope.formula) {
          $scope.errors.push('Error: there was no info to submit.');
          return console.log('No information in the object when calling submit!');
        }

        addCopy.fields = $scope.formula;

        additiveService.create(addCopy, function(err, data) {
          if (err) {
            $scope.errors.push(err);
            console.log(err.msg);
          } else {
            $scope.serverMessages.push('Success. Additive added to database.');
            $scope.formula = [];
            $scope.addForm = {};
            $scope.myServerAdds.push(data);
          }
        });
      };

      $scope.getAll = function() {
        additiveService.getAll((err, data) => {
          if (err) {
            $scope.errors.push('There was an error in getting the additives information.');
            return console.log('Error: ', err);
          }
          $scope.myServerAdds = data;
        });
      };

      $scope.removeFromFormula = function(item) {
        $scope.formula.splice($scope.formula.indexOf(item), 1);
      };

      $scope.addElement = function(element) {
        var localtry = {};
        if (!element) {
          $scope.errors.push('Error: please select an element.');
          return;
        }
        localtry.name = element;
        localtry.amount = 0;
        $scope.formula.push(localtry);
      };

      $scope.addComponent = function(component) {
        var localtry = {};
        if (!component) {
          $scope.errors.push('Error: please select an component.');
          return;
        }
        localtry.name = component;
        localtry.amount = 0;
        $scope.formula.push(localtry);
      };

      $scope.getStandard = function() {
        additiveService.getStandard((err, data) => {
          if (err) {
            $scope.errors.push('There was an error in getting the standard additives information.');
            return console.log('Error: ', err);
          }
          $scope.standardAdds = data;
        });
      };

      $scope.editMyListToggle = function() {
        $scope.editToggle = !$scope.editToggle;
      };

      $scope.removeMyAdd = function(theAdd) {
        additiveService.delete(theAdd, (err) => {
          if (err) {
            $scope.errors.push('Error in deleting the additive from the server.');
            return console.log('Error: ', err);
          }
          $scope.serverMessages.push('Success in removing the additive from the server.');
        });
        $scope.myServerAdds.splice($scope.myServerAdds.indexOf(theAdd), 1);
      };
    }]);
};

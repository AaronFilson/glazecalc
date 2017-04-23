module.exports = function(app) {
  app.controller('MaterialController',
    ['$scope', '$http', 'gcaResource', function($scope, $http, Resource) {

      $scope.errors = [];
      $scope.serverMessages = [];
      $scope.formula = [];
      $scope.matForm = {};
      $scope.myServerMats = [];
      $scope.standardMats = [];
      $scope.editToggle = false;

      var materialService = Resource('/materials/');

      $scope.dismissError = function(err) {
        $scope.errors.splice($scope.errors.indexOf(err), 1);
      };

      $scope.dismissMessage = function(message) {
        $scope.serverMessages.splice($scope.serverMessages.indexOf(message), 1);
      };

      $scope.submit = function(material) {
        var matCopy = material;
        if (!matCopy || !$scope.formula) {
          $scope.errors.push('Error: there was no info to submit.');
          return console.log('No information in the object when calling submit!');
        }
        matCopy.fields = $scope.formula;
        materialService.create(matCopy, function(err, data) {
          if (err) {
            $scope.errors.push(err);
            console.dir('Error: ', err);
          } else {
            $scope.serverMessages.push('Success. Material added to database.');
            $scope.formula = [];
            $scope.matForm = {};
            $scope.myServerMats.push(data);
          }
        });
      };

      $scope.getAll = function() {
        materialService.getAll((err, data) => {
          if (err) {
            $scope.errors.push('There was an error in getting the materials information.');
            return console.log('Error: ', err);
          }
          $scope.myServerMats = data;
        });
      };

      $scope.removeFromFormula = function(item) {
        $scope.formula.splice($scope.formula.indexOf(item), 1);
      };

      $scope.addFormulaField = function(component, element) {
        console.log('values for select vars: ', component, element);
        var localtry = {};
        if (component && element) {
          $scope.errors.push('Error: please select only one thing to add at a \
           time. Reset to none and try again.');
          return;
        }
        localtry.name = component || element || 'error- select a value above';
        localtry.amount = 0;
        $scope.formula.push(localtry);
      };

      $scope.getStandard = function() {
        materialService.getStandard((err, data) => {
          if (err) {
            $scope.errors.push('There was an error in getting the standard materials information.');
            return console.log('Error: ', err);
          }
          $scope.standardMats = data;
        });
      };

      $scope.editMyListToggle = function() {
        $scope.editToggle = !$scope.editToggle;
      };

      $scope.removeMyMat = function(theMat) {
        materialService.delete(theMat, (err) => {
          if (err) {
            $scope.errors.push('Error in deleting the material from the server.');
            return console.log('Error: ', err);
          }
        });
        $scope.myServerMats.splice($scope.myServerMats.indexOf(theMat), 1);
      };
    }]);
};

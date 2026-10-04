const chemistry = require('../../../../lib/chemistry');

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
      $scope.matForm.percentmole = 'molecular';
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
        // Derive the unity formula and weights from the formula and LOI so they
        // always agree with each other.
        var weights;
        try {
          weights = chemistry.materialWeights(matCopy);
        } catch (e) {
          return $scope.errors.push('Error: ' + e.message);
        }
        weights.warnings.forEach( function(warning) {
          $scope.errors.push('Warning: ' + warning);
        });
        matCopy.fields.forEach( function(oxide) {
          oxide.amountUnity = weights.unity[oxide.name] || 0;
        });
        // These are shown in the materials tables; recipe calculations derive
        // them again from the formula and LOI, so rounding here is safe.
        var round = function(value, places) {
          return Number(value.toFixed(places));
        };
        matCopy.fields.forEach( function(oxide) {
          oxide.amountUnity = round(oxide.amountUnity, 4);
        });
        matCopy.equivalent = round(weights.equivalent, 2);
        matCopy.formulaweight = round(weights.firedWeight, 2);
        matCopy.molecularweight = round(weights.molecularWeight, 2);
        matCopy.loi = weights.loi;

        materialService.create(matCopy, function(err, data) {
          if (err) {
            $scope.errors.push((err.data && err.data.msg) || 'Error: the request to the server failed.');
            console.log(err.msg);
          } else {
            $scope.serverMessages.push('Success. Material added to database.');
            $scope.formula = [];
            $scope.matForm = {};
            $scope.matForm.percentmole = 'molecular';
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

      $scope.addFiredField = function(oxide) {
        var localtry = {};
        if (!oxide) {
          $scope.errors.push('Error: please select an oxide.');
          return;
        }
        localtry.name = oxide;
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
          $scope.serverMessages.push('Success in removing the material from the server.');
        });
        $scope.myServerMats.splice($scope.myServerMats.indexOf(theMat), 1);
      };
    }]);
};

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
        var oxides = {};
        oxides.PbO = 223;
        oxides.Na2O = 62;
        oxides.K2O = 94;
        oxides.ZnO = 81;
        oxides.CaO = 56;
        oxides.MgO = 40;
        oxides.BaO = 153;
        oxides.SrO = 120;
        oxides.Li2O = 30;
        oxides.Al2O3 = 102;
        oxides.B2O3 = 70;
        oxides.SiO2 = 60;
        // add Ti and Fe later if needed
        matCopy.fields = $scope.formula;
        if (matCopy.percentmole === 'percent') {
          var localUnity = {};
          matCopy.fields.forEach( function(ox1) {
            localUnity[ox1.name] = Number(ox1.amount) / oxides[ox1.name];
          });
          localUnity.findFlux = (localUnity.PbO ? localUnity.PbO : 0) +
            (localUnity.Li2O ? localUnity.Li2O : 0) +
            (localUnity.Na2O ? localUnity.Na2O : 0) +
            (localUnity.K2O ? localUnity.K2O : 0) +
            (localUnity.CaO ? localUnity.CaO : 0) +
            (localUnity.MgO ? localUnity.MgO : 0) +
            (localUnity.ZnO ? localUnity.ZnO : 0) +
            (localUnity.BaO ? localUnity.BaO : 0) +
            (localUnity.SrO ? localUnity.SrO : 0);

          // If there is no flux, stop from dividing by zero!
          if ( localUnity.findFlux < 0.001 ) localUnity.findFlux = 1;
          matCopy.fields.forEach( function(ox2) {
            ox2.amountUnity = localUnity[ox2.name] / localUnity.findFlux;
          });
        } else {
          var checkUnity = {};
          matCopy.fields.forEach( function(ox3) {
            checkUnity[ox3.name] = Number(ox3.amount);
          });
          checkUnity.findFlux = (checkUnity.PbO ? checkUnity.PbO : 0) +
            (checkUnity.Li2O ? checkUnity.Li2O : 0) +
            (checkUnity.Na2O ? checkUnity.Na2O : 0) +
            (checkUnity.K2O ? checkUnity.K2O : 0) +
            (checkUnity.CaO ? checkUnity.CaO : 0) +
            (checkUnity.MgO ? checkUnity.MgO : 0) +
            (checkUnity.ZnO ? checkUnity.ZnO : 0) +
            (checkUnity.BaO ? checkUnity.BaO : 0) +
            (checkUnity.SrO ? checkUnity.SrO : 0);

          // If there is no flux, stop from dividing by zero!
          if ( checkUnity.findFlux < 0.001 ) checkUnity.findFlux = 1;
          matCopy.fields.forEach( function(ox4) {
            ox4.amountUnity = checkUnity[ox4.name] / checkUnity.findFlux;
          });
        }

        materialService.create(matCopy, function(err, data) {
          if (err) {
            $scope.errors.push(err);
            console.log(err.msg);
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

      // $scope.addFormulaField = function(component, element) {
      //   console.log('values for select vars: ', component, element);
      //   var localtry = {};
      //   if (component && element) {
      //     $scope.errors.push('Error: please select only one thing to add at a \
      //      time. Reset to none and try again.');
      //     return;
      //   }
      //   localtry.name = component || element || 'error- select a value above';
      //   localtry.amount = 0;
      //   $scope.formula.push(localtry);
      // };
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

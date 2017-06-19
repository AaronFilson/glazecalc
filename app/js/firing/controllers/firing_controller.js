module.exports = function(app) {
  app.controller('FiringController',
    ['$scope', '$http', 'gcaResource', function($scope, $http, Resource) {

      $scope.errors = [];
      $scope.serverMessages = [];
      $scope.rows = [];
      $scope.firingForm = {};
      $scope.firingForm.fieldsIncluded = [];
      $scope.myServerFirings = [];
      $scope.editToggle = false;

      var firingService = Resource('/firing/');

      $scope.dismissError = function(err) {
        $scope.errors.splice($scope.errors.indexOf(err), 1);
      };

      $scope.dismissMessage = function(message) {
        $scope.serverMessages.splice($scope.serverMessages.indexOf(message), 1);
      };

      $scope.submit = function(incFiring) {
        var firing = incFiring;
        if (!firing || !$scope.rows || !firing.fieldsIncluded || !firing.title) {
          $scope.errors.push('Error: there was no info to submit.');
          return console.log('No information in the object when calling submit!');
        }
        if (!firing.date) {
          firing.date = new Date();
        }

        firing.rows = $scope.rows;

        firingService.create(firing, function(err, data) {
          if (err) {
            $scope.errors.push(err);
            return console.dir('Error: ', err);
          }
          $scope.firingForm = null;
          $scope.firingForm = {};
          $scope.firingForm.fieldsIncluded = [];
          $scope.rows = null;
          $scope.rows = [];
          $scope.myServerFirings.push(data);
          $scope.serverMessages.push('Success in adding the firing record to the server.');
        });
      };

      $scope.getAll = function() {
        firingService.getAll((err, data) => {
          if (err) {
            $scope.errors.push('There was an error in getting the firing records information.');
            return console.log('Error: ', err);
          }
          $scope.myServerFirings = data;
        });
      };

      $scope.removeFromRows = function(item) {
        $scope.rows.splice($scope.formula.indexOf(item), 1);
      };

      $scope.removeFromFields = function(item) {
        $scope.firingForm.fieldsIncluded.splice($scope.firingForm.fieldsIncluded.indexOf(item), 1);
      };

      $scope.addField = function(fld) {
        if (!fld) {
          $scope.errors.push('Error: please select an field.');
          return;
        }
        $scope.firingForm.fieldsIncluded.push(fld);
      };

      $scope.moveFieldLeft = function(fldmv) {
        if (!fldmv) {
          $scope.errors.push('Error: there is no field to move.');
        }
        var currPosition = $scope.firingForm.fieldsIncluded.indexOf(fldmv);
        if (currPosition > 0) {
          $scope.firingForm.fieldsIncluded.splice(
            currPosition - 1, 0, $scope.firingForm.fieldsIncluded.splice(
              currPosition, 1)[0]
          );
        }
      };

      $scope.moveFieldRight = function(fldmv) {
        if (!fldmv) {
          $scope.errors.push('Error: there is no field to move.');
        }
        var currPosition = $scope.firingForm.fieldsIncluded.indexOf(fldmv);
        if (currPosition < $scope.firingForm.fieldsIncluded.length - 1) {
          $scope.firingForm.fieldsIncluded.splice(
            currPosition + 1, 0, $scope.firingForm.fieldsIncluded.splice(
              currPosition, 1)[0]
          );
        }
      };

      $scope.addRow = function() {
        $scope.rows.push([]);

        for (var i = 0; i < $scope.firingForm.fieldsIncluded.length; i++) {
          $scope.rows[$scope.rows.length - 1][i] = '';
        }
      };

      $scope.editMyListToggle = function() {
        $scope.editToggle = !$scope.editToggle;
      };

      $scope.removeMyFiring = function(theFiring) {
        firingService.delete(theFiring, (err) => {
          if (err) {
            $scope.errors.push('Error in deleting the firing from the server.');
            return console.log('Error: ', err);
          }
          $scope.serverMessages.push('Success in removing the firing from the server.');
        });
        $scope.myServerFirings.splice($scope.myServerFirings.indexOf(theFiring), 1);
      };
    }]);
};

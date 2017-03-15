module.exports = function(app) {
  app.controller('TrashController',
    ['$scope', '$http', 'gcaResource', function($scope, $http, Resource) {
      $scope.errors = [];
      var trashService = Resource('/trash');

      $scope.dismissError = function(err) {
        $scope.errors.splice($scope.errors.indexOf(err), 1);
      };

      $scope.submit = function(trash) {
        if (!trash) {
          $scope.errors.push('Error: there was no info to submit.');
          return console.log('No information in the object when calling submit!');
        }
        trashService.create(trash, function(err) {
          if (err) {
            $scope.errors.push(err);
            return console.dir('Error: ', err);
          }
        });
      };
    }]);
};

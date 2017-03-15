module.exports = function(app) {
  app.controller('NotesController',
    ['$scope', '$http', 'gcaResource', function($scope, $http, Resource) {
      $scope.errors = [];
      var notesService = Resource('/notes');

      $scope.dismissError = function(err) {
        $scope.errors.splice($scope.errors.indexOf(err), 1);
      };

      $scope.submit = function(notes) {
        if (!notes) {
          $scope.errors.push('Error: there was no info to submit.');
          return console.log('No information in the object when calling submit!');
        }
        notesService.create(notes, function(err) {
          if (err) {
            $scope.errors.push(err);
            return console.dir('Error: ', err);
          }
        });
      };
    }]);
};

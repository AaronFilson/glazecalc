module.exports = function(app) {
  app.controller('NotesController',
    ['$scope', '$http', 'gcaResource', function($scope, $http, Resource) {
      $scope.errors = [];
      $scope.serverMessages = [];
      $scope.notesForm = {};
      $scope.notesData = [];
      var notesService = Resource('/notes/');

      $scope.dismissError = function(err) {
        $scope.errors.splice($scope.errors.indexOf(err), 1);
      };

      $scope.dismissMessage = function(message) {
        $scope.serverMessages.splice($scope.serverMessages.indexOf(message), 1);
      };

      $scope.editMyListToggle = function() {
        $scope.editToggle = !$scope.editToggle;
      };

      $scope.removeMyNote = function(theNote) {
        notesService.delete(theNote, (err) => {
          if (err) {
            $scope.errors.push('Error in deleting the note from the server.');
            return console.log('Error: ', err);
          }
          $scope.serverMessages.push('Success in removing the note from the server.');
        });
        $scope.notesData.splice($scope.notesData.indexOf(theNote), 1);
      };

      $scope.submit = function(note) {
        if (!note.title || !note.content) {
          $scope.errors.push('Error: there was missing info on submit.');
          return console.log('Missing information in the object when calling submit.');
        }

        note.relatedCollection = 'Notes';
        note.relatedId = 'general notes';
        notesService.create(note, function(err, data) {
          if (err) {
            $scope.errors.push(err);
            return console.dir('Error: ', err);
          }
          $scope.notesForm = {};
          $scope.notesData.push(data);
          $scope.serverMessages.push('Success in adding the note to the server.');
        });
      };
    }]);
};

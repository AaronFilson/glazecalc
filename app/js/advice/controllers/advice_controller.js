module.exports = function(app) {
  app.controller('AdviceController',
    ['$scope', '$http', 'gcaResource', function($scope, $http, Resource) {
      $scope.errors = [];
      var adviceService = Resource('/advice');

      $scope.dismissError = function(err) {
        $scope.errors.splice($scope.errors.indexOf(err), 1);
      };

      $scope.submit = function(advice) {
        if (!advice) {
          $scope.errors.push('Error: there was no info to submit.');
          return console.log('No information in the object when calling submit!');
        }
        adviceService.create(advice, function(err) {
          if (err) {
            $scope.errors.push(err);
            return console.dir('Error: ', err);
          }
        });
      };
    }]);
};

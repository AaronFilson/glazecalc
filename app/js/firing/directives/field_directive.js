module.exports = function(app) {
  app.directive('fieldSelect', function() {
    return {
      restrict: 'EA',
      templateUrl: '/templates/firing/directives/field_dir_template.html'
    };
  });
};

const chemistry = require('../../../../lib/chemistry');

module.exports = function(app) {
  app.controller('RecipeController',
    ['$scope', '$http', 'gcaResource', function($scope, $http, Resource) {
      $scope.errors = [];
      $scope.serverMessages = [];
      $scope.recipeForm = {};
      $scope.recipeMats = [];
      $scope.myRecipes = [];
      $scope.customs = [];
      $scope.standards = [];
      $scope.additives = [];
      $scope.standardadds = [];
      $scope.addList = [];

      var recipeService = Resource('/recipe/');
      var matService = Resource('/materials/');
      var addService = Resource('/additives/');

      $scope.getMats = function() {
        matService.getAll((err, data) => {
          if (err) {
            $scope.errors.push('There was an error in getting the custom materials information.');
            return console.log('Error: ', err);
          }
          $scope.customs = data;
        });
        matService.getStandard((err, data) => {
          if (err) {
            $scope.errors.push('There was an error in getting the standard materials information.');
            return console.log('Error: ', err);
          }
          $scope.standards = data;
        });
      };

      $scope.getAdds = function() {
        addService.getAll((err, data) => {
          if (err) {
            $scope.errors.push('There was an error in getting the custom additives information.');
            return console.log('Error: ', err);
          }
          $scope.additives = data;
        });
        addService.getStandard((err, data) => {
          if (err) {
            $scope.errors.push('There was an error in getting standard additives information.');
            return console.log('Error: ', err);
          }
          $scope.standardadds = data;
        });
      };

      $scope.dismissError = function(err) {
        $scope.errors.splice($scope.errors.indexOf(err), 1);
      };

      $scope.dismissMessage = function(message) {
        $scope.serverMessages.splice($scope.serverMessages.indexOf(message), 1);
      };

      // Calculates the unity formula with the shared chemistry module. The
      // result keeps the uList key that saved recipes and the view already use.
      $scope.computeUnity = function(inp) {
        var result;
        try {
          result = chemistry.calculateUMF(inp.map( function(mat) {
            return { material: mat, amount: mat.amount };
          }));
        } catch (e) {
          $scope.errors.push('Error: ' + e.message);
          $scope.recipeForm.computed = null;
          return null;
        }
        result.warnings.forEach( function(warning) {
          $scope.errors.push('Warning: ' + warning);
        });
        result.uList = result.umf;
        $scope.recipeForm.computed = result;
        return result;
      };

      $scope.addMyMaterialField = function(mynewmat) {
        if (!mynewmat) {
          return $scope.errors.push('Error: please select a material to add.');
        }

        $scope.recipeMats.push(JSON.parse(mynewmat));
      };

      $scope.addStdMaterialField = function(stdnewmat) {
        if (!stdnewmat) {
          return $scope.errors.push('Error: please select a material to add.');
        }

        $scope.recipeMats.push(JSON.parse(stdnewmat));
      };

      $scope.addMyAdditiveField = function(mynewadd) {
        if (!mynewadd) {
          return $scope.errors.push('Error: please select an additive to add.');
        }

        $scope.addList.push(JSON.parse(mynewadd));
      };

      $scope.addStdAdditiveField = function(stdnewadd) {
        if (!stdnewadd) {
          return $scope.errors.push('Error: please select an additive to add.');
        }

        $scope.addList.push(JSON.parse(stdnewadd));
      };

      $scope.removeFromRecipe = function(theMat) {
        $scope.recipeMats.splice($scope.recipeMats.indexOf(theMat), 1);
      };

      $scope.submit = function(recipe) {
        if (!recipe || !recipe.title || !$scope.recipeMats.length) {
          $scope.errors.push('Error: there was missing info.');
          return console.log('Missing info.');
        }

        recipe.materials = $scope.recipeMats;
        recipe.additives = $scope.addList;
        if (!recipe.date) {
          recipe.date = new Date();
        }
        if (!recipe.notes) {
          recipe.notes = 'None.';
        }
        // Always recompute so amounts edited after pressing compute are saved correctly.
        recipe.computed = $scope.computeUnity(recipe.materials);
        if (!recipe.computed) return;

        recipeService.create(recipe, function(err, data) {
          if (err) {
            $scope.errors.push((err.data && err.data.msg) || 'Error: the request to the server failed.');
            return console.dir('Error: ', err);
          }

          $scope.serverMessages.push('Success. Recipe added to database.');
          $scope.recipeMats = null;
          $scope.recipeMats = [];
          $scope.recipeForm = null;
          $scope.recipeForm = {};
          $scope.addList = [];
          $scope.myRecipes.push(data);
        });
      };

      $scope.getMyRecipes = function() {
        recipeService.getAll((err, data) => {
          if (err) {
            $scope.errors.push('There was an error in getting the recipe information.');
            return console.log('Error: ', err);
          }

          $scope.myRecipes = data;
        });
      };

      $scope.removeFromAdds = function(add) {
        $scope.addList.splice($scope.addList.indexOf(add), 1);
      };

      $scope.editMyListToggle = function() {
        $scope.editToggle = !$scope.editToggle;
      };

      $scope.removeMyRec = function(theRec) {
        recipeService.delete(theRec, (err) => {
          if (err) {
            $scope.errors.push('Error in deleting the recipe from the server.');
            return console.log('Error: ', err);
          }
          $scope.serverMessages.push('Success in removing the recipe from the server.');
        });
        $scope.myRecipes.splice($scope.myRecipes.indexOf(theRec), 1);
      };
    }]);
};

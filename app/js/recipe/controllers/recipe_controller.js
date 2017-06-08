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
      $scope.myRecipes = [];

      var recipeService = Resource('/recipe/');
      var matService = Resource('/materials/');

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

      $scope.dismissError = function(err) {
        $scope.errors.splice($scope.errors.indexOf(err), 1);
      };

      $scope.dismissMessage = function(message) {
        $scope.serverMessages.splice($scope.serverMessages.indexOf(message), 1);
      };

      $scope.computeUnity = function(inp) {
        var unityTable = {};
        // Step 1
        inp.forEach( function(mat) {
          mat.formulaEquivalent = Number(mat.amount) / Number(mat.equivalent);
        });

        // Step 2  - ish
        // make the table of oxides to use in summing to unity
        inp.forEach( function(material) {
          material.fields.forEach( function(oxideEle) {
            unityTable[oxideEle.name] = 0;
          });
        });

        // Step 3 and 4
        inp.forEach( function(material) {
          var localEq = material.formulaEquivalent;
          material.fields.forEach( function(oxideEle) {
            unityTable[oxideEle.name] += oxideEle.amountUnity * localEq;
          });
        });

        // make the amounts 0 for those oxides not used
        unityTable.PbO = unityTable.PbO ? unityTable.PbO : 0;
        unityTable.Li2O = unityTable.Li2O ? unityTable.Li2O : 0;
        unityTable.Na2O = unityTable.Na2O ? unityTable.Na2O : 0;
        unityTable.K2O = unityTable.K2O ? unityTable.K2O : 0;
        unityTable.CaO = unityTable.CaO ? unityTable.CaO : 0;
        unityTable.MgO = unityTable.MgO ? unityTable.MgO : 0;
        unityTable.ZnO = unityTable.ZnO ? unityTable.ZnO : 0;
        unityTable.BaO = unityTable.BaO ? unityTable.BaO : 0;
        unityTable.SrO = unityTable.SrO ? unityTable.SrO : 0;
        unityTable.SiO2 = unityTable.SiO2 ? unityTable.SiO2 : 0;
        unityTable.Al2O3 = unityTable.Al2O3 ? unityTable.Al2O3 : 0;
        unityTable.B2O3 = unityTable.B2O3 ? unityTable.B2O3 : 0;
        unityTable.Fe2O3 = unityTable.Fe2O3 ? unityTable.Fe2O3 : 0;
        unityTable.TiO2 = unityTable.TiO2 ? unityTable.TiO2 : 0;
        unityTable.P2O5 = unityTable.P2O5 ? unityTable.P2O5 : 0;

        // Step 5
        // add the values of the column one, RO / fluxes
        unityTable.fluxTotal = unityTable.PbO + unityTable.Li2O + unityTable.Na2O +
          unityTable.K2O + unityTable.CaO + unityTable.MgO + unityTable.ZnO +
          unityTable.BaO + unityTable.SrO;

        // If there is no flux in this formula (yet I hope!) then don't divide by zero
        if ( unityTable.fluxTotal < 0.001 ) unityTable.fluxTotal = 1;
        // Step 6
        // divide the amounts of all of the oxides by the fluxTotal and it is in unity!
        unityTable.uList = {};
        unityTable.uList.PbO = unityTable.PbO / unityTable.fluxTotal;
        unityTable.uList.Li2O = unityTable.Li2O / unityTable.fluxTotal;
        unityTable.uList.Na2O = unityTable.Na2O / unityTable.fluxTotal;
        unityTable.uList.K2O = unityTable.K2O / unityTable.fluxTotal;
        unityTable.uList.CaO = unityTable.CaO / unityTable.fluxTotal;
        unityTable.uList.MgO = unityTable.MgO / unityTable.fluxTotal;
        unityTable.uList.ZnO = unityTable.ZnO / unityTable.fluxTotal;
        unityTable.uList.BaO = unityTable.BaO / unityTable.fluxTotal;
        unityTable.uList.SrO = unityTable.SrO / unityTable.fluxTotal;
        unityTable.uList.SiO2 = unityTable.SiO2 / unityTable.fluxTotal;
        unityTable.uList.Al2O3 = unityTable.Al2O3 / unityTable.fluxTotal;
        unityTable.uList.B2O3 = unityTable.B2O3 / unityTable.fluxTotal;
        unityTable.uList.Fe2O3 = unityTable.Fe2O3 / unityTable.fluxTotal;
        unityTable.uList.TiO2 = unityTable.TiO2 / unityTable.fluxTotal;
        unityTable.uList.P2O5 = unityTable.P2O5 / unityTable.fluxTotal;

        // at this stage, the empirical formula is listed of each of the oxides,
        // and the unity formula is in a list as uList in the unityTable object
        $scope.recipeForm.computed = unityTable;
        return unityTable;
      };

      $scope.addMaterialField = function(mynewmat, stdnewmat) {
        if (mynewmat && stdnewmat) {
          return $scope.errors.push('Error: please select only one material to add.');
        }
        if (!mynewmat && !stdnewmat) {
          return $scope.errors.push('Error: please select a material to add.');
        }
        var toAdd = JSON.parse(mynewmat) || JSON.parse(stdnewmat);
        $scope.recipeMats.push(toAdd);
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
        if (!recipe.date) {
          recipe.date = new Date();
        }
        if (!recipe.notes) {
          recipe.notes = '';
        }
        if (!recipe.computed) {
          recipe.computed = $scope.computeUnity(recipe.materials);
        }

        recipeService.create(recipe, function(err) {
          if (err) {
            $scope.errors.push(err);
            return console.dir('Error: ', err);
          }

          $scope.serverMessages.push('Success. Recipe added to database.');
          $scope.recipeMats = null;
          $scope.recipeMats = [];
          $scope.recipeForm = {};
          $scope.myRecipes.push(recipe);
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
    }]);
};

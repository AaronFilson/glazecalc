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
        console.log(inp);
        var unityTable = {};
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

        // add up the amounts of the materials
        var sumOfAmounts = inp.reduce( function(acc, currEle) {
          return acc + Number(currEle.amount);
        }, 0);
        // find the relative percent divisor : what portion is the material
        var percentDivisor = sumOfAmounts; // inp.length;
        // save the percent contribution from each material
        inp.forEach( function(ele) {
          ele.percent = (0 + ele.amount) / percentDivisor;
        });
        // from the percent and molecular equivalent get the empirical contrib
        inp.forEach( function(mat) {
          mat.contrib = mat.percent / Number(mat.equivalent);
        });
        // go into each material and find percent amounts for the oxides
        inp.forEach( function(quan) {
          // the percent should be adding to 100. If not correct it.
          var totalOfPercents = quan.fields.reduce( function(acc, percs) {
            return acc + Number(percs.amount);
          }, 0);

          quan.fields.forEach( function(per) {
            per.mpercent = (Number(per.amount) / totalOfPercents) * 100;
          });

          // for each of the fields the molecular equivalent needs to be found
          quan.fields.forEach( function(individualOx) {
            individualOx.moleEquiv = individualOx.mpercent * oxides[individualOx.name];
          });
        });

        // make the table of oxides to use in summing to unity
        inp.forEach( function(material) {
          material.fields.forEach( function(oxideEle) {
            unityTable[oxideEle.name] = 0;
          });
        });
        inp.forEach( function(material) {
          material.fields.forEach( function(oxideEle) {
            unityTable[oxideEle.name] += oxideEle.moleEquiv * material.contrib;
          });
        });
        debugger;
        // add the values of the column one, RO / fluxes
        unityTable.PbO = unityTable.PbO ? unityTable.PbO : 0;
        unityTable.Li2O = unityTable.Li2O ? unityTable.Li2O : 0;
        unityTable.Na2O = unityTable.Na2O ? unityTable.Na2O : 0;
        unityTable.K2O = unityTable.K2O ? unityTable.K2O : 0;
        unityTable.CaO = unityTable.CaO ? unityTable.CaO : 0;
        unityTable.MgO = unityTable.MgO ? unityTable.MgO : 0;
        unityTable.ZnO = unityTable.ZnO ? unityTable.ZnO : 0;
        unityTable.BaO = unityTable.BaO ? unityTable.BaO : 0;
        unityTable.SrO = unityTable.SrO ? unityTable.SrO : 0;

        unityTable.fluxTotal = unityTable.PbO + unityTable.Li2O + unityTable.Na2O +
          unityTable.K2O + unityTable.CaO + unityTable.MgO + unityTable.ZnO +
          unityTable.BaO + unityTable.SrO;

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


        // at this stage, the empirical formula is listed of each of the oxides,
        // and the unity formula is in a list as uList in the unityTable object
        $scope.recipeForm.computed = unityTable;
        return 'Success.';
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
          recipe.computed = $scope.computeUnity(recipe);
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
    }]);
};

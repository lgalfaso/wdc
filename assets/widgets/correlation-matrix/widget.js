define([
    'angular',
    'widgets/table/data-widget',
    'widgets/data-dialogs/correlation-matrix-dialog',
    'widgets/data-util/adapter'
  ],
  function (angular) {

    var m = angular.module('app.widgets.correlation-matrix', [
      'app.widgets.data-widget',
      'app.widgets.data-util.adapter',
      'app.widgets.data-dialogs.correlation-matrix-dialog'
    ]);


    m.controller('CorrelationMatrixCtrl', function ($scope, CorrelationMatrixDialog, DataWidget, CorrelationTableGenerator) {
      new DataWidget($scope, {
        dialog: CorrelationMatrixDialog,
        //decorationAdapter:DataTableDecorationAdapter,
        serieGenerator: CorrelationTableGenerator
      })
    });
  });

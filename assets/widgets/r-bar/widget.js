import angular from 'angular';
import 'widgets/nvd3-widget/nvd3-widget';
import 'widgets/data-util/adapter';
import 'widgets/data-dialogs/bar-chart-dialog';

const m = angular.module('app.widgets.r-bar', [
  'app.widgets.nvd3-widget',
  'app.widgets.data-util.adapter',
  'app.widgets.data-dialogs.bar-chart-dialog'
]);


m.service('NVD3BarAdapter', function () {
  this.applyDecoration = function (options, decoration) {
    if (angular.isDefined(decoration) && angular.isDefined(options)) {
      options.chart.height = decoration.height;
      options.title.text = decoration.title;
      options.subtitle.text = decoration.subtitle;
      options.caption.text = decoration.caption;
      options.chart.xAxis.axisLabel = decoration.xAxisName;
      options.chart.yAxis.axisLabel = decoration.yAxisName;
      options.chart.xAxis.staggerLabels = decoration.staggerLabels;
      options.chart.rotateLabels = decoration.xAxisAngle;
      options.chart.reduceXTicks = decoration.reduceXTicks;
      options.chart.showControls = decoration.showControls;
      options.chart.stacked = decoration.stacked;

      options.chart.color = (decoration.color) ? decoration.color : null;
    }
    return options;
  };
  this.getDecoration = function (options) {
    if (angular.isDefined(options)) {
      var decoration = {};
      decoration.height = options.chart.height;
      decoration.title = options.title.text;
      decoration.subtitle = options.subtitle.text;
      decoration.caption = options.caption.text;
      decoration.xAxisName = options.chart.xAxis.axisLabel;
      decoration.yAxisName = options.chart.yAxis.axisLabel;
      decoration.xAxisAngle = options.chart.rotateLabels;
      decoration.reduceXTicks = options.chart.reduceXTicks;
      decoration.staggerLabels = options.chart.xAxis.staggerLabels;
      decoration.color = options.chart.color;
      decoration.showControls = options.chart.showControls;
      decoration.stacked = options.chart.stacked;

      return decoration;
    }
  }
});

m.controller('Nvd3BarChartCtrl', function ($scope, $http, APIProvider,BarChartDialog, NVD3BarAdapter, NVD3Widget, BarSerieGenerator) {
  // new NVD3Widget($scope, {
  //   dialog: BarChartDialog,
  //   decorationAdapter: NVD3BarAdapter,
  //   optionsURL: "/widgets/nvd3-bar/options.json",
  //   serieAdapter: {
  //     getX: function (d) {
  //       return d.label
  //     },
  //     getY: function (d) {
  //       return d.value
  //     }
  //   },
  //   serieGenerator: BarSerieGenerator
  // })

    
      $scope.APIProvider = new APIProvider($scope);

      $scope.APIProvider.config(function () {
      $http.get("./widgets/nvd3-bar/options.json")
        .success(function (data) {
                $scope.options = data;
                $scope.options.chart.x = function (d) { return d.label };
                $scope.options.chart.y = function (d) { return d.value };
                
                $http.post("./api/data/process/",
                      {
                          "data_id": "554664d0eab35c7822fd7967",
                          "proc_name": "barchartserie",
                          "response_type": "data"
                      })
                .success(function (data) {
                   $scope.data = data.data;
                   // console.log($scope.data)
                   $scope.settings = { options: $scope.options, data: $scope.data };
                })
          });    
      }, true)

    
});

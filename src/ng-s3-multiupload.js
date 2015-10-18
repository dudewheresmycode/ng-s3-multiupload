
angular.module('s3.multiupload',[])


.run([ '$templateCache', function($templateCache) {
    $templateCache.put('uploadarea.tpl.html', '<div class="panel" ng-style="{\'background-color\':drag_hover?\'#FFFAD1\':\'none\'}"><div class="panel-body"><table class="table"><thead><tr><th>Filename</th><th>Size</th><th>Progress</th></tr></thead><tbody><tr ng-repeat="file in files"><td>{{file.name}}</td><td>{{file.size|s3MBytes}}</td><td>{{file.status}}</td></tr></tbody></table></div></div>');
} ])

.filter('s3MBytes', function() {
	return function(bytes, precision) {
		if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
		if (typeof precision === 'undefined') precision = 1;
		var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'],
			number = Math.floor(Math.log(bytes) / Math.log(1024));
		return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
	}
})
.service('s3MUploader',function($http,$q){
	var that = this;
	this.items = {};
	this.getItems = function(){
		return this.items;
	}
	this.addItem = function(item){
		this.items.push(item);
	}
	this.upload = function(){
		var deferred = $q.defer();		
		
    var fd = new FormData();
    fd.append('acl', acl);
    fd.append('Content-Type', file.type);
    fd.append('AWSAccessKeyId', accessKey);
    fd.append('policy', policy);
    fd.append('signature', signature);
    fd.append("file", file);
    fd.append('key', key);

    var xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", uploadProgress, false);
    xhr.addEventListener("load", uploadComplete, false);
    xhr.addEventListener("error", uploadFailed, false);
    xhr.addEventListener("abort", uploadCanceled, false);
	}
})
.directive('s3MultiUpload',function($document,s3MUploader){
	return {
		templateUrl: 'uploadarea.tpl.html',
		link: function(scope,ele,attr){
			scope.files = s3MUploader.getItems();
			$document
			.bind('dragenter',function(e){
				e.stopPropagation();
				e.preventDefault();
				scope.drag_hover=true;
				scope.$apply();
			})
			.bind('dragover',function(e){
				e.stopPropagation();
				e.preventDefault();
				e.dataTransfer.dropEffect = 'copy';
				scope.drag_hover=true;
				scope.$apply();
			})
			.bind('dragleave',function(e){
				scope.drag_hover=false;
				scope.$apply();
			})
			.bind('drop',function(e){
				e.stopPropagation();
				e.preventDefault();				
				angular.forEach(e.dataTransfer.files, function(v,k){
					var item = {name:v.name, size:v.size, status:0};
					scope.files.push(item);
					console.log(scope.files);
				});
				scope.drag_hover=false;				
				scope.$apply();
			});			
		}
	}
})

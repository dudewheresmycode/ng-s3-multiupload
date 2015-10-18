
angular.module('s3.multiupload',[])


.run([ '$templateCache', function($templateCache) {
    $templateCache.put('uploadarea.tpl.html', '<div class="panel" ng-style="{\'background-color\':drag_hover?\'#FFFAD1\':\'none\'}"><div class="panel-body"><table class="table"><thead><tr><th>Filename</th><th>Size</th><th>Progress</th></tr></thead><tbody><tr ng-repeat="file in files"><td>{{file.name}}</td><td>{{file.size|s3MBytes}}</td><td ng-if="file.status!=2">{{file.status|s3MStatus}}</td><td ng-if="file.status==2">{{file.progress}}</td></tr></tbody></table></div></div>');
} ])

.filter('s3MStatus', function() {
	return function(status) {
		var st = ['Queued','Starting','Uploading','Complete'];
		return st[status];
	}
})
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
	this.bucket = 'ng-s3-multiupload';
	this.s3creds = {};
	this.current = 0;
	this.uploading=false;
/*
	this.getItems = function(){
		return this.items;
	}
	this.addItem = function(item){
		console.log('ADD', item);
		this.items.push(item);
	}
*/

	this.start = function(scope){
		if(!this.uploading){
			console.log('starting upload');
			if(scope){ this.scope = scope; }
			
			that.scope.files[that.current].status = 1;
			
			this.getPolicy(this.bucket).then(function(data){


				that.s3creds = data;
				that.upload().then(function(err){
					that.next();
				},function(err,status){
					throw err;
					
				});
				console.log(data);
			},function(err){
				throw Error("ERROR"+ err);
			});
			//this.upload();
		}
	}
	this.getPolicy = function(b){
		var deferred = $q.defer();
		$http.get('../server/sign.php?bucket='+b)
		.success(function(data,status){
			deferred.resolve(data);
		})
		.error(function(error, status){
			deferred.reject(error);
		});
		return deferred.promise;
	}
	
	this.next = function(){
    if(that.current < (that.scope.files.length-1)){
	    that.current++;
	    that.start();
	    console.log('next done');
    }else{
	    that.uploading=false;
	    console.log('all done');
    }
	}
	
	this.upload = function(){
		var deferred = $q.defer();		
		var file = that.scope.files[that.current].file;
		
    var fd = new FormData();
    fd.append('acl', 'public-read');
    fd.append('Content-Type', that.scope.files[that.current].type);
    fd.append('AWSAccessKeyId', that.s3creds.key);
    fd.append('policy', that.s3creds.policy);
    fd.append('signature', that.s3creds.signature);
    fd.append('key', 'files/'+file.name);
    fd.append("file", file);
		console.log(fd);
		
    var xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", uploadProgress, false);
    xhr.addEventListener("load", uploadComplete, false);
    xhr.addEventListener("error", uploadFailed, false);
    xhr.addEventListener("abort", uploadCanceled, false);
		var s3Uri = 'https://' + this.bucket + '.s3.amazonaws.com/';
    xhr.open('POST', s3Uri, true);
    xhr.send(fd);
    
    function uploadProgress(e){
	    var p = Math.round(e.loaded * 100 / e.total);
	    console.log('upload progress', p);

			that.scope.$apply(function(){
				that.scope.files[that.current].progress = p;
				that.scope.files[that.current].status = 2;
			});

    }
    function uploadComplete(e){
	    console.log('upload done');
			
			var s = 4;
			if (xhr.status === 204) { // successful upload
				deferred.resolve(xhr);
				s = 3;
			} else {
				deferred.reject(xhr);
			}
			that.scope.$apply(function(){
				that.scope.files[that.current].progress = 100;
				that.scope.files[that.current].status = s;
			});
    }
		function uploadFailed(e) {
			console.log('upload failed');
			that.scope.$apply(function(){
				that.scope.files[that.current].status = 4;
			});
      deferred.reject(xhr);
		}
		function uploadCanceled(e) {
			console.log('canceled upload');
			deferred.reject(xhr);
		}
		return deferred.promise;
	}
})
.directive('s3MultiUpload',function($document,s3MUploader){
	return {
		templateUrl: 'uploadarea.tpl.html',
/*
		link: function(scope,ele,attr){
		},
*/
    compile: function (element, attr, linker) {
      return {
				pre: function ($scope, $element, $attr) {
				},
				post: function (scope, element, attrs) {

		
					scope.files = [];
					//s3MUploader.getItems();
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
							var item = {name:v.name, size:v.size, file:v, status:0, progress:0};
							//s3MUploader.addItem(item);
							scope.files.push(item);
						});
						scope.drag_hover=false;				
						//scope.files = s3MUploader.getItems();
						scope.$apply();
						s3MUploader.start(scope);
					});			

					
				}
			}
		}
	}
})

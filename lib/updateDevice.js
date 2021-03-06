var devices = require('./database').collection('devices');

module.exports = function(uuid, params, callback) {

  var newTimestamp = new Date().getTime();
  
  // by default we are doing a stanard "set", but you can pass in other actions too
  var action = "$set";
  if(params["action"]){
    action = "$"+params["action"];
  }
  
  var regdata = {uuid:uuid};
  
  var updates = {};
  var secondaryObj = {}
  // Loop through parameters to update device
  for (var param in params) {
    try {
      var parsed = JSON.parse(params[param]);
    } catch (e) {
      var parsed = params[param];
    }
    if(action=="$set"){
      updates[param] = parsed;  
    }
    else if(params!="uuid"&&params!="token") {
      secondaryObj[param] = parsed;
    }
  }

  if (params["online"]){
    updates["online"] = Boolean((params["online"] == "true"));
  }
  updates["timestamp"] = newTimestamp;

  //console.log(updates);
  //console.log(secondaryObj);

  devices.update({
    uuid: {"$regex":uuid,"$options":"i"}, token: params["token"]
  }, {
    $set: updates
  }, function(err, saved) {

    if(err || saved == 0) {

      console.log("Device not found or token not valid");
      regdata = {
        "errors": [{
          "message": "Device not found or token not valid",
          "code": 404
        }]
      };
      callback(regdata);
      

    } else {    

      // merge objects
      for (var attrname in updates) { 
        // lets catch anything they are making null but didnt specify an action of unset
        if(updates[attrname]===''||updates[attrname]==null){
          action="$unset";
          secondaryObj[attrname] = updates[attrname];
        }
        regdata[attrname] = updates[attrname]; 
      }

      // remove token from results object
      delete regdata.token
      console.log('Device udpated: ' + JSON.stringify(regdata));

      // is there a secondary action we need to take
      if(action!="$set") {
        
        // clean up the object before we proceed
        var getRidOf = ["uuid","timestamp","action","token"];
        for (var attrname in secondaryObj) {
          regdata[attrname] = secondaryObj[attrname]; 
          if(getRidOf.indexOf(attrname)!=-1){
            delete secondaryObj[attrname];
          }
        }
        // remove token from results object
        delete regdata.token

        var qryObj = {};
        qryObj[action] = secondaryObj;
        //console.log(qryObj);
        devices.update({
          uuid: {"$regex":uuid,"$options":"i"}, token: params["token"]
        }, qryObj, function(err, saved) {

          if(err || saved == 0) {

            console.log("Error doing "+action);

            regdata = {
              "errors": [{
                "message": "Unable to perform secondary operation",
                "code": 404
              }]
            };
            callback(regdata);

          } else {    

            console.log('Secondary complete: ' + JSON.stringify(regdata));

            callback(regdata);
          }

        });

      } else {
        callback(regdata);  
      }
      
    }

  });

};
var taskrouterDashboard = new Vue({
  el: '#taskrouterDashboard',
  data: {
    headerMessage: 'TaskRouter Real-Time Dashboard',
    loggedUser: "ameer@twilio.com",
    userAuthenticated: false,
    syncStatus: "Disconnected",
    totalTasks: 0,
    currentTaskStatus: {
      pending: 0,
      reserved: 0,
      assigned: 0,
      wrapping: 0,
      completed: 0,
      canceled: 0
    },
    totalWorkers: 0,
    currentWorkerActivity: {
      offlineWorkers: 0,
      idleWorkers: 0,
      unavailableWorkers: 0,
      wrapupWorkers: 0
    },
    avgTaskAcceptanceTime: "0",
    missedSLA: false,
    withinSLA: true,
    eventType: "Connected to Event Stream",
    stats_get_url: "/sync_taskrouter_statistics",
    workers_get_url: "/taskrouter_workers",
    workers: {},
    tasks_get_url: "/taskrouter_tasks",
    taskList: [],
    alertList: [],
    taskWorker: {'1': '1'},
    taskCurrentSteps: {
      "canceled": 0,
      "pending": 1,
      "reserved": 2,
      "assigned": 3,
      "wrapping": 4,
      "completed": 5
    },
    timestamp: "",
    level: "",
    error_code: "",
    method: "",
    status_code: "",
    body: "",
  },
  methods: {
    displayRecording: function (task) {
      if (task.taskStatus == 'completed' && task.channel == 'Phone' && (task.recordingUrl).length > 1) {
        return true;
      }
      else {
        return false;
      }
    },
    playAudio: function(id) {
      console.log(id);
      this.$refs.callRecording[id].play();
    },
    pauseAudio: function(id) {
      this.$refs.callRecording[id].pause();
    },
    fetchWorkers: function () {
      var self = this;
      // Fetch the current Workers List
      var worker = {};
      return axios.get(this.workers_get_url + '?userid=' + this.loggedUser)
        .then(function (response) {
          self.workers = {};
          //console.log(response.data);
          var workers = response.data;
          worker = {};
          for (var i in workers) {
            worker[workers[i]['worker_sid']] = workers[i]['friendly_name'];
          }
          self.workers = worker;
        })
        .catch(function (error) {
          console.log(error);
        })
    },
    fetchTasks: function () {
      var self = this;
      // Fetch the current Tasks List
      var task = {};
      var taskSid;
      return axios.get(this.tasks_get_url + '?userid=' + this.loggedUser)
        .then(function (response) {
          self.taskList = [];
          var tasks = response.data;
          for (var i in tasks) {
            task = {};
            task['taskSid'] = tasks[i]['TaskSid'];
            task['from'] = tasks[i]['from']
            task['channel'] = tasks[i]['channel']
            task['recordingUrl'] = tasks[i]['RecordingUrl'];
            taskSid = task['taskSid'];
            task['agentName'] = tasks[i]['WorkerName'];
            task['priority'] = tasks[i]['Priority'];
            task['taskStatus'] = tasks[i]['TaskStatus'];
            if (task['taskStatus'] == 'completed') {
              task['successStatus'] = 'success';
              task['errorStatus'] = '';
              // $.getJSON("/getcallstats", {callSid: tasks[i]['worker_call_sid']})
              // .then(function(response) {
              //   console.log(response)
              // })
              // .catch(err => {
              //   console.log(err)
              // });
            }
            else if (task['taskStatus'] == 'canceled') {
              task['successStatus'] = '';
              task['cancelStatus'] = 'error';
            }
            else {
              task['successStatus'] = '';
              task['cancelStatus'] = '';
            }
            console.log(task);
            self.taskList.push(task);
          }
        })
        .catch(function (error) {
          console.log(error);
        })
    },
    taskCurrentStep: function (status) {
      return this.taskCurrentSteps[status];
    },
    assignWorker (taskSid, workerName) {
        var self = this;
        self.taskWorker[taskSid] = workerName;
    },
    syncEvents: function(data) {
      this.eventType = data['EventType'];
      this.fetchTasks();
    },
    syncTaskRouterStats: function(data) {
      if (data != null) {
        console.log(data)
        this.totalTasks = data['totalTasks'];
        this.currentTaskStatus['pending'] = data['pendingTasks'];
        this.currentTaskStatus['reserved'] = data['reservedTasks'];
        this.currentTaskStatus['assigned'] = data['assignedTasks'];
        this.currentTaskStatus['wrapping'] = data['wrappingTasks'];
        if (data['completedTasks']) {
          this.currentTaskStatus['completed'] = data['completedTasks'];
        } else {
          this.currentTaskStatus['completed'] = 0;
        }
        if (data['canceledTasks']) {
          this.currentTaskStatus['canceled'] = data['canceledTasks'];
        } else {
          this.currentTaskStatus['canceled'] = 0;
        }
        this.avgTaskAcceptanceTime = data['avgTaskAcceptanceTime'];
        console.log(this.avgTaskAcceptanceTime )
        if (this.avgTaskAcceptanceTime  > 120) {
          this.missedSLA = true;
          this.withinSLA = false;
        } else {
          this.missedSLA = false;
          this.withinSLA = true;
        }
        this.totalWorkers = data['totalWorkers'];
        this.currentWorkerActivity['offlineWorkers'] = data['activityOfflineWorkers'];
        this.currentWorkerActivity['idleWorkers'] = data['activityAvailableWorkers'];
        this.currentWorkerActivity['unavailableWorkers'] = data['activityUnavailableWorkers'];
        this.currentWorkerActivity['wrapupWorkers'] = data['wrappingTasks'];
      }
    },
    syncAlarms: function(data) {
      if (data != null) {
        var self = this;
        console.log(data)
        self.alertList = []
        for (var i in data ) {
          alarm = {}
          alarm['timestamp'] = data[i]['timestamp'];
          alarm['level'] = data[i]['level'];
          alarm['error_code'] = data[i]['error_code'];
          alarm['method'] = data[i]['method'];
          alarm['body']  = data[i]['body'];

          self.alertList.push(alarm)
        }
        self.alertList.sort((a, b) => (b.timestamp > a.timestamp) ? 1 : -1)
      }
    },
    serverSideStatsInit: function() {
      return axios.get(this.stats_get_url + '?userid=' + this.loggedUser)
        .then(function (response) {
          console.log(response)
          console.log('Server Side Stats Synced');
        })
        .catch(function (error) {
          console.log(error);
        })
    }
  },
  mounted() {
    console.log('In mounted!')
    this.serverSideStatsInit();
    this.fetchTasks();
    $.getJSON('/alarms', function (response) {
      console.log(response)
    })
  }
})

// Twilio Sync setup
//Our interface to the Sync service
var syncClient;
//We're going to use a single Sync document, our simplest
//synchronisation primitive, for this demo
var syncDocName;
var userid = taskrouterDashboard.$data.loggedUser;
var ts = Math.round((new Date()).getTime() / 1000);
tokenUserid = userid + ts;
taskrouterDashboard.$data.syncEndpoint = tokenUserid;
$.getJSON('/token' + '?identity=' + tokenUserid, function (tokenResponse) {
  console.log('In get token!')
  //Initialize the Sync client
  syncClient = new Twilio.Sync.Client(tokenResponse.token, { logLevel: 'info' });
  console.log('******DEBUG', syncClient)
  taskrouterDashboard.$data.syncStatus = userid + ' Connected';
  //This code will create and/or open a Sync TaskRouter Events document
  syncDocName = 'SyncTaskRouterEvents';
  syncClient.document(syncDocName).then(function(doc) {
    //doc.set({});
    console.log(syncDocName + ' Opened: ' + doc.value)
  })
  .catch((err) => console.log(err));
  //Let's subscribe to changes on this document, so when something
  //changes on this document, we can trigger our UI to update
  syncClient.document(syncDocName).then(function (doc) {
    doc.on("updated",function(data) {
      console.log('SyncTaskRouterEvents: ' + JSON.stringify(data));
      taskrouterDashboard.syncEvents(data);
      //taskrouterDashboard.fetchData();
    });
  })
  .catch((err) => console.log(err));
  //This code will create and/or open a Sync TaskRouter Workflow Stats document
  syncDocName = 'SyncTaskRouterStats';
  syncClient.document(syncDocName).then(function(doc) {
    console.log(syncDocName + ' Opened: ' + doc.value)
  })
  .catch((err) => console.log(err));
  //Let's subscribe to changes on this document, so when something
  //changes on this document, we can trigger our UI to update
  syncClient.document(syncDocName).then(function (doc) {
    doc.on("updated",function(data) {
      console.log('SyncTaskRouterStats: '+ JSON.stringify(data));
      taskrouterDashboard.syncTaskRouterStats(data);
    });
  })
  .catch((err) => console.log(err));
  //This code will create and/or open a Sync Alarm Events document
  syncDocName = 'SyncAlarms';
  syncClient.document(syncDocName).then(function(doc) {
    //doc.set({});
    console.log(syncDocName + ' Opened: ' + doc.value)
  })
  .catch((err) => console.log(err));
  //Let's subscribe to changes on this document, so when something
  //changes on this document, we can trigger our UI to update
  syncClient.document(syncDocName).then(function (doc) {
    doc.on("updated",function(data) {
      console.log('SyncAlarms: ' + JSON.stringify(data));
      taskrouterDashboard.syncAlarms(data);
      //taskrouterDashboard.fetchData();
    });
  })
  .catch((err) => console.log(err));
});

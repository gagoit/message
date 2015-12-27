/**
* Message module
**/
var Message = {
  /**
  * init
  **/
  init: function(){
    this.msg_icon = $("#header_inbox_bar");
    this.main_side = $(".chat-room .main-side");
    this.left_side = $(".chat-room .left-side");
    this.conversations = $(".chat-room ul.conversations");

    this.chat_area = $("#chat-area");

    this.chat_area_modal = $("#chat-area-modal");

    this.init_events();
    this.auto_show_conversation();
    this.scrollLoading = false;
  },

  /**
  * init events
  **/
  init_events: function(){
    var self = this;

    if(self.msg_icon.length > 0){
      self.msg_icon.click(function (e){
        var current_page = self.msg_icon.find("ul.inbox").attr("data-page");
        if(current_page == "0"){
          self.msg_icon.find("a.dropdown-toggle span.badge").html("");
          self.load_received_messages(current_page);
        }
      });

      self.scroll_message_on_dropdown();

      /** send-new-message **/
      self.msg_icon.find("ul.inbox").delegate(".send-new-message", "click", function(e){
        e.preventDefault();
        self.load_chat_area_modal();
      });
    }

    /** Load conversation: on modal / on page **/
    $(document).delegate(".received-message > a", "click", function(e){
      e.preventDefault();

      var friend_id = $(this).closest("li.received-message").attr("data-uid");

      if($(this).closest("ul.inbox").length > 0){
        self.load_chat_area_modal(friend_id);
      }else{
        window.location.hash = friend_id;
        self.load_chat_area(friend_id);
      }
    });

    /** Delete a message **/
    $(document).delegate(".received-message .remove-msg", "click", function(e){
      e.preventDefault();
      var msg_id = $(this).attr("data-uid");
      var li = $(this).closest(".received-message");

      self.delete_conversation(msg_id, li);
      return false;
    });

    /** Mark a message as read/unread **/
    $(document).delegate(".received-message .mark-as-read", "click", function(e){
      e.preventDefault();
      var msg_id = $(this).attr("data-uid");
      var li = $(this).closest(".received-message");

      self.mark_as_read_unread(msg_id, li);
      return false;
    });

    $(document).delegate("#chat-area .new-to .label .remove", "click", function(){
      var chat_area = $(this).closest("#chat-area");
      chat_area.find("#message_received_by_id").val("");
      chat_area.find(".new-to input").show();
      chat_area.find(".new-to input").val("");
      chat_area.find(".new-to input").focus();

      chat_area.find(".messages-content").html("");

      $(this).parent().remove();
    });

    $(document).delegate('#chat-area #press_to_enter', 'click', function() {
      var chat_area = $(this).closest("#chat-area");
      var checkedValue = chat_area.find('#press_to_enter:checked').val();

      if(checkedValue){
        chat_area.find("#post_button").hide();
      } else {
        chat_area.find("#post_button").show();
      }
    });

    $(document).delegate('#chat-area textarea#message', 'keydown', function(e) {
      var chat_area = $(this).closest("#chat-area");
      var checkedValue = chat_area.find('#press_to_enter:checked').val();
      var form = chat_area.find("form");

      if(checkedValue){
        //enter key
        if (e.keyCode == 13) {
          //submit form
          e.preventDefault();
          self.create_message(form);
        }
      }
    });

    $(document).delegate('#chat-area #post_button', 'click', function(e) {
      var chat_area = $(this).closest("#chat-area");
      var checkedValue = chat_area.find('#press_to_enter:checked').val();

      var form = chat_area.find("form");

      if(!checkedValue){
        //submit form
        e.preventDefault();
        self.create_message(form);
      }
    });

    /** New Message **/
    $(document).delegate('#chat-area #new-message', 'click', function(){
      var current_chat_area = $(this).closest("#chat-area");

      if(current_chat_area.parent().hasClass("modal-body")){
        self.load_chat_area_modal();
      }else{
        self.load_chat_area();
      }
    });

    /** Register Event search friend's conversation **/
    this.search_friend_on_old_converstations();
  },

  /**
  * create message
  **/
  create_message: function(form){
    var self = this;
    if(typeof form == "undefined"){
      return ;
    }

    var received_by_id = form.find('#message_received_by_id').val();
    var message = form.find("#message").val();

    var current_chat_area = form.closest("#chat-area");
    var last_timestamp = current_chat_area.attr("data-last-timestamp");
    var messages_content = current_chat_area.find(".messages-content");

    var fb_loading_icon = form.find(".fb-loading-icon");
    fb_loading_icon.show();

    if(received_by_id != ''){
      //form.submit();
      $.ajax("/messages.json", {
        type: 'POST',
        data: {
          message: {
            received_by_id: received_by_id,
            message: message
          },
          last_timestamp: last_timestamp
        }
      }).done(function(ev){
        if(ev.success){
          current_chat_area.attr("data-last-timestamp", ev.last_timestamp);

          messages_content.append($(ev.new_messages_html));
          messages_content.scrollTop(messages_content.prop("scrollHeight"));

          form.find("#message").val("");

          fb_loading_icon.hide();    
        }
      });
    }else{
      $.notify("No recipient specified.", { position: "bottom right", style: 'bootstrap', className: 'error' });
    }
  },

  /**
  * Register event to search new people to send new message
  **/
  search_people_for_new_message_typeahead: function(current_chat_area){
    var self = this;

    if(typeof current_chat_area == "undefined"){
      current_chat_area = self.main_side.find(".chat-area");
    }

    current_chat_area.find(".new-to input").typeahead(
      {
        hint: true,
        highlight: true,
        minLength: 3
      },
      {
        name: 'users',
        display: 'name',
        source: new Bloodhound({
          datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
          queryTokenizer: Bloodhound.tokenizers.whitespace,
          remote: {
            url: '/users/search_friends.json?q=%QUERY',
            wildcard: '%QUERY'
          }
        }),
        templates: {
          empty: [
            '<div class="empty-message">',
            'No people that match the current query',
            '</div>'
          ].join('\n'),
          suggestion: Handlebars.compile("<div class='a-friend' data-uid='{{id}}'>"
              + "<img src='{{image}}' class='search-image'>"
              + "<span class='search-container'>"
              + "<strong> {{name}} </strong>"
              + "</span>"
              + "</div>")
        }
      }
    ).on("typeahead:selected", function(ev, user){
      $('<span class="label label-info">' + user.name + '<span class="remove" data-role="remove">x</span></span>').insertAfter(current_chat_area.find(".new-to span").first());
      current_chat_area.find("#message_received_by_id").val(user.id);
      current_chat_area.find(".new-to input").hide();
    });
  },

  /**
  * Load chat area modal
  * When user click on a message in messages-notification, show chat modal for this conversation
  **/
  load_chat_area_modal: function(friend_id){
    var self = this;

    self.chat_area_modal.find(".loading-icon").show();

    $.ajax("/messages/load_a_conversation", {
      type: 'GET',
      data: {
        friend_id: friend_id
      }
    }).done(function(ev){
      self.chat_area_modal.find(".modal-body").html(ev);
      self.chat_area_modal.find(".loading-icon").hide();

      var current_chat_area = self.chat_area_modal.find(".modal-body #chat-area");
      if (current_chat_area.find(".new-to").length > 0){
        self.search_people_for_new_message_typeahead(current_chat_area);
      }

      var messages_content = current_chat_area.find(".messages-content");
      messages_content.scrollTop(messages_content.prop("scrollHeight"));

      self.scroll_message_on_conversation(current_chat_area);
    });
    
    self.chat_area_modal.modal({
      backdrop: 'static',
      keyboard: false
    });

    return ;
  },

  /**
  * Load chat area
  * If the first time loading: load chat area from server, render and also store in a hidden div
  * If this chat area is loaded, just get it from hidden div
  **/
  load_chat_area: function(friend_id){
    var self = this;

    /** Update html for old friend's conversation **/
    var old_html = self.main_side.find(".chat-area").find("#chat-area");
    var old_friend_id = old_html.attr("data-uid");
    self.main_side.find(".other-chat").find("#chat-area[data-uid='" + old_friend_id + "']").remove();

    self.main_side.find(".other-chat").append(old_html);

    /* Check new conversation is loaded or not */
    var html = self.main_side.find(".other-chat").find("#chat-area[data-uid='" + friend_id + "']");

    var has_update_unread = false;

    if(html.length > 0){
      self.main_side.find(".chat-area").html(html);

      var current_chat_area = self.main_side.find(".chat-area #chat-area");
      var messages_content = current_chat_area.find(".messages-content");
      messages_content.scrollTop(messages_content.prop("scrollHeight"));

      has_update_unread = true;
    }else{
      self.main_side.find(".loading-icon").show();

      $.ajax("/messages/load_a_conversation", {
        type: 'GET',
        data: {
          friend_id: friend_id
        }
      }).done(function(ev){
        self.main_side.find(".chat-area").html(ev);
        self.main_side.find(".loading-icon").hide();
        self.main_side.find(".other-chat").append($(ev));

        var current_chat_area = self.main_side.find(".chat-area #chat-area");
        if (current_chat_area.find(".new-to").length > 0){
          self.search_people_for_new_message_typeahead(current_chat_area);
        }

        var messages_content = current_chat_area.find(".messages-content");
        messages_content.scrollTop(messages_content.prop("scrollHeight"));

        self.scroll_message_on_conversation(current_chat_area);
      });
    }

    self.conversations.find("li.received-message").each(function(){
      var li = $(this);
      if(li.attr("data-uid") == friend_id){
        li.removeClass("active").addClass("active");

        if(li.hasClass("unread")){
          if(has_update_unread){
            li.find(".mark-as-read").click();
          }else{
            /** reduce number of unread **/
            self.update_number_of_unread();
            self.change_status_read_unread(li, "read");
          }
        }else{
          self.change_status_read_unread(li, "read");
        }
        
      }else{
        li.removeClass("active");
      }
    });
    return ;
  },

  /**
  * Load more messages on a conversation
  **/
  load_more_messages_on_conversation: function(current_chat_area){
    var self = this;

    var loading_icon = current_chat_area.find(".loading-icon");
    loading_icon.show();

    var friend_id = current_chat_area.attr("data-uid");
    var last_message = current_chat_area.find(".group-rom:first");
    var last_timestamp = last_message.attr("data-created-at");

    $.ajax("/messages/load_a_conversation", {
      type: 'GET',
      data: {
        friend_id: friend_id,
        last_timestamp: last_timestamp
      }
    }).done(function(ev){
      $(ev).insertAfter(loading_icon);
      loading_icon.hide();
    });
    
    return ;
  },

  /**
  * scroll messages on conversation (popup / page)
  **/
  scroll_message_on_conversation: function(current_chat_area){
    var self = this;

    var msg_div = current_chat_area.find(".messages-content");
    msg_div.niceScroll({cursorwidth: "7px", cursorcolor:"#999"});
    
    $(msg_div).scroll(function() {
      if($(msg_div).scrollTop() == 0 ) {
        // ajax call get data from server and append to the div
        self.load_more_messages_on_conversation(current_chat_area);
      }
    });
  },

  /** 
  * Search friend on old conversations
  **/
  search_friend_on_old_converstations: function(){
    var self = this;

    var search_field = self.left_side.find("#search_friend_on_conversations");

    var conversations = self.conversations.find("li");

    if(search_field.length > 0){
      search_field[0].addEventListener("input", function (){
        var search_key = $(this).val().toLowerCase();

        conversations.each(function(index, field){
          if($(field).attr("data-name").toLowerCase().indexOf(search_key) > -1 || 
            $(field).attr("data-email").toLowerCase().indexOf(search_key) > -1){

            $(field).show();
          }else {
            $(field).hide();
          }
        });
      });
    }

    // self.left_side.find("#search_friend_on_conversations").typeahead(
    //   {
    //     hint: true,
    //     highlight: true,
    //     minLength: 2
    //   },
    //   {
    //     name: 'users',
    //     displayKey: 'value',
    //     source: function(query, process){
    //       $.ajax('/users/search_friend_on_conversations', {
    //         type: "GET",
    //         data: { q: query },
    //         dataType: "json",
    //         success: function(data){
    //           process(data);
    //         }
    //       });
    //     },
    //     templates: {
    //       empty: [
    //         '<div class="empty-message">',
    //         'No people or conversations that match the current query',
    //         '</div>'
    //       ].join('\n'),
    //       suggestion: Handlebars.compile("<div class='a-friend' data-uid='{{id}}'>"
    //           + "<img src='{{image}}' class='search-image'>"
    //           + "<span class='search-container'>"
    //           + "<strong> {{first_name}} {{last_name}}</strong>"
    //           + "</span>"
    //           + "</div>")
    //     }
    //   }
    // ).on("typeahead:selected", function(ev, user){
    //   $('<span class="label label-info">' + user.first_name + ' ' + user.last_name + '<span class="remove" data-role="remove">x</span></span>').insertAfter($(".new-to span").first());
    //   self.main_side.find("#message_received_by_id").val(user.id);
    //   self.main_side.find(".new-to input").hide();
    // });
  },

  /**
  * Delete a message on conversation
  **/
  delete_conversation: function(message_id, message_ele){
    var self = this;
    
    if(confirm("Are you sure to delete this conversation?")){
      $.ajax("/messages/delete_conversation", {
        type: 'POST',
        data: {
          message_id: message_id
        }
      }).done(function(ev){
        if(ev.success){
          var friend_id = message_ele.attr("data-uid");
          var lis = $("li.received-message[data-uid='" + friend_id + "']");
          
          lis.remove();

          self.load_default_conversation();
        }
      });
    }
  },

  /**
  * Mark a message as read/unread
  **/
  mark_as_read_unread: function(message_id, li){
    var self = this;
    
    var type = li.hasClass("read") ? "unread" : "read";

    $.ajax("/messages/mark_as_read_unread", {
      type: 'POST',
      data: {
        message_id: message_id,
        type: type
      }
    }).done(function(ev){
      if(ev.success){
        self.change_status_read_unread(li, type);

        self.update_number_of_unread(ev.number_unread);
      }
    });
  },

  /**
  * Update all li.received-message to new status
  **/
  change_status_read_unread: function(li, type){
    var friend_id = li.attr("data-uid");
    var lis = $("li.received-message[data-uid='" + friend_id + "']");

    lis.each(function() {
      $(this).removeClass("read").removeClass("unread").addClass(type);
      var icon = $(this).find(".mark-as-read");

      if(type == "read"){
        icon.removeClass("fa-check-circle-o").addClass("fa-circle-o");
        icon.attr("title", "Mark as unread");
      }else{
        icon.removeClass("fa-circle-o").addClass("fa-check-circle-o");
        icon.attr("title", "Mark as read");
      }
    });
  },

  /**
  * Update number of unread conversation
  **/
  update_number_of_unread: function(number_unread){
    var inbox = $(".inbox-number-unread");
    if(typeof number_unread == "undefined"){
      try{
        var current_num = inbox.attr("data-num");
        number_unread = parseInt(current_num) - 1;

        if(number_unread < 0){
          return;
        }
      }catch(e){
        return;
      }
    }

    if(number_unread > 0){
      inbox.html("Inbox (" + number_unread + ")");
    }else{
      inbox.html("Inbox");
    }

    inbox.attr("data-num", number_unread);
  },

  /**
  * Load received messages on dropdown
  **/
  load_received_messages: function(page){
    var self = this;
    var next_page = parseInt(page) + 1;
    self.msg_icon.find(".inbox .loading-icon").show();

    $.ajax("/messages/received_messages", {
      type: 'GET',
      data: {
        page: next_page
      }
    }).done(function(ev){
      self.msg_icon.find("ul.inbox").attr("data-page", next_page);
      $(ev).insertBefore(".inbox .loading-icon");
      self.msg_icon.find(".inbox .loading-icon").hide();
    });
  },

  /**
  * scroll messages on drop down
  **/
  scroll_message_on_dropdown: function(){
    var self = this;
    var msg_div = self.msg_icon.find("ul.dropdown-menu .middle");
    msg_div.niceScroll({cursorwidth: "7px", cursorcolor:"#999"});

    $(msg_div).scroll(function() {
      if($(msg_div).scrollTop() +  $(msg_div).innerHeight()  >  this.scrollHeight - 20) {
        // ajax call get data from server and append to the div
        var current_page = self.msg_icon.find("ul.inbox").attr("data-page");
        self.load_received_messages(current_page);
      }
    });

    // $(msg_div).infinitescroll({
    //   // other options
    //   dataType: 'json',
    //   appendCallback: false
    // }, function(json, opts) {
    //   // Get current page
    //   var page = opts.state.currPage;
    //   console.log("load more .... " + page);
    //   // Do something with JSON data, create DOM elements, etc ..
    //   self.load_messages(current_page);
    // });
  },

  /** 
  * Load default conversation (new/first conversation) 
  * when have no conversation or invalid hash
  **/
  load_default_conversation: function(){
    var self = this;

    if(self.conversations.find("li.received-message").length > 0){
      self.conversations.find("li.received-message").first().find("> a").click();
    }else{
      self.load_chat_area();
    }
  },

  /**
  * Auto show a conversation
  **/
  auto_show_conversation: function(){
    var self = this;

    if(self.conversations.length > 0){
      if(self.conversations.find("li.received-message").length == 0){
        self.load_chat_area();
        return;
      }

      var hash = document.location.hash;
      if (hash) {
        var valid_hash = false;
        self.conversations.find("li.received-message").each(function(){
          if($(this).attr("data-uid") == hash){
            $(this).removeClass("active").addClass("active");
            valid_hash = true;
          }else{
            $(this).removeClass("active");
          }
        });

        if(!valid_hash){
          window.location.hash = "";
          self.load_default_conversation();
        }else{
          self.load_chat_area(hash);
        }
      }else{
        self.load_default_conversation();
      }

    }
  }
}

$(function() {
  Message.init();
});
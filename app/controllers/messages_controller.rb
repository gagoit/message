class MessagesController < ApplicationController
  before_action :set_message, only: [:show, :edit, :update, :destroy]

  before_filter :authenticate_user!

  PER_PAGE = 10

  # GET /messages
  # GET /messages.json
  def index
    @messages = Message.load_conversations(current_user)
  end

  # GET /messages/load_a_conversation
  # GET /messages/load_a_conversation.json
  # for current user
  # @params:
  #  
  def load_a_conversation
    @last_timestamp = params[:last_timestamp].to_time rescue nil
    @per_page = 10
    
    if @friend = (User.find(params[:friend_id]) rescue nil)
      if @last_timestamp
        @messages = Message.load_conversation(current_user, @friend).where("messages.created_at < ? ", @last_timestamp).limit(@per_page)
      else
        @messages = Message.load_conversation(current_user, @friend).limit(@per_page)

        if first_msg = @messages.first
          first_msg.mark_as_read_unread!(current_user, "read")
        end
      end
    else 
      @messages = []
    end

    respond_to do |format|
      format.html { render :layout => false }
      format.json { render :layout => false }
    end
  end

  # GET /messages/received_messages
  # GET /messages/received_messages.json
  # for current user
  # @params:
  #  
  def received_messages
    @page = (params[:page] || 1).to_i rescue 1
    @messages = Message.load_conversations(current_user).paginate(page: @page, per_page: 2)
    if @page > 1
      @num_of_new = 0
    else
      @num_of_new = Message.new_conversation(current_user).count

      Message.new_messages(current_user).update_all(is_new: false)
    end

    respond_to do |format|
      format.html { render :layout => false}
      format.json {  }
    end
  end

  def mark_as_read_unread
    if @message = (Message.find(params[:message_id]) rescue nil)
      return_data = @message.mark_as_read_unread!(current_user, params[:type])

      respond_to do |format|
        format.html { redirect_to messages_url, notice: "Message was successfully mark as #{params[:type]}." }
        format.json { render :json => return_data }
      end
    else
      respond_to do |format|
        format.html { redirect_to messages_url, notice: 'Message is not found.' }
        format.json { render :json => {success: false, error_message: 'Message is not found.'} }
      end
    end
  end

  def delete_message
    if @message = (Message.find(params[:message_id]) rescue nil)
      #@message.destroy

      respond_to do |format|
        format.html { redirect_to messages_url, notice: 'Message was successfully destroyed.' }
        format.json { render :json => {success: true} }
      end
    else
      respond_to do |format|
        format.html { redirect_to messages_url, notice: 'Message is not found.' }
        format.json { render :json => {success: false} }
      end
    end
  end

  def delete_conversation
    if @message = (Message.find(params[:message_id]) rescue nil)
      @message.delete_conversation(current_user)

      respond_to do |format|
        format.html { redirect_to messages_url, notice: 'Conversation was successfully destroyed.' }
        format.json { render :json => {success: true} }
      end
    else
      respond_to do |format|
        format.html { redirect_to messages_url, notice: 'Conversation is not found.' }
        format.json { render :json => {success: false} }
      end
    end
  end

  # GET /messages/1
  # GET /messages/1.json
  def show
  end

  # GET /messages/new
  def new
    @message = Message.new
  end

  # GET /messages/1/edit
  def edit
  end

  # POST /messages
  # POST /messages.json
  def create
    @message = current_user.created_messages.new(message_params)

    respond_to do |format|
      if @message.save
        @new_messages = Message.load_conversation(current_user, @message.received_by).where("messages.created_at > ?", params[:last_timestamp].to_time)

        format.html { redirect_to @message, notice: 'Message was successfully created.' }
        format.json { render :json => {
            new_messages_html: (render_to_string :partial => "messages/messages_in_chat_area", locals: {messages: @new_messages}, formats: [:html]),
            message: @message,
            new_messages: @new_messages,
            last_timestamp: Time.zone.now.advance({second: 1}),
            success: true
          } }
        format.js {}
      else
        format.html { render :new }
        format.json { render json: @message.errors, status: :unprocessable_entity }
        format.js {}
      end
    end
  end

  # PATCH/PUT /messages/1
  # PATCH/PUT /messages/1.json
  def update
    respond_to do |format|
      if @message.update(message_params)
        format.html { redirect_to @message, notice: 'Message was successfully updated.' }
        format.json { render :show, status: :ok, location: @message }
      else
        format.html { render :edit }
        format.json { render json: @message.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /messages/1
  # DELETE /messages/1.json
  def destroy
    @message.destroy
    respond_to do |format|
      format.html { redirect_to messages_url, notice: 'Message was successfully destroyed.' }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_message
      @message = Message.find(params[:id])
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def message_params
      params[:message].permit(:message, :received_by_id)
    end
end

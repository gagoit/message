class Message < ActiveRecord::Base
  belongs_to :created_by, class_name: 'User', foreign_key: :created_by_id
  belongs_to :received_by, class_name: 'User', foreign_key: :received_by_id 

  has_many :users, through: :user_messages
  has_many :user_messages

  validates_presence_of :created_by_id, :received_by_id, :message

  scope :last_msg_on_conversation, -> {where("messages.id IN (SELECT MAX(messages.id) FROM messages GROUP BY message_code)").order(created_at: :desc)}

  scope :msgs_on_conversation, ->(msg_code) {where(message_code: msg_code)}

  before_save do
    self.message_code = Message.get_message_code(created_by_id, received_by_id)
  end

  after_create do
    self.user_messages.create({user_id: created_by_id, message_code: message_code, is_read: true, is_new: false})

    self.user_messages.create({user_id: received_by_id, message_code: message_code, is_read: false, is_new: true})
  end

  # Message code (conversation id) of messages from two people
  # 
  # @return [String] message code
  #
  # @author DatPB  
  def self.get_message_code(uid1, uid2)
    if uid1 <= uid2
      "#{uid1}-#{uid2}"
    else
      "#{uid2}-#{uid1}"
    end
  end

  # Load all conversations of a user
  # @param user [User] the User object
  # 
  # @return [Array] the array of conversations
  # .joins("LEFT JOIN user_messages ON messages.id = user_messages.message_id")
  # @author DatPB
  def self.load_conversations(user)
    #Message.includes([:created_by, :received_by]).where("received_by_id = ? OR created_by_id = ?", user.id, user.id)
    Message.includes([:created_by, :received_by]).last_msg_on_conversation.joins("LEFT JOIN user_messages ON messages.id = user_messages.message_id").where("user_messages.user_id = ? AND user_messages.is_deleted = ?", user.id, false).select("messages.*, user_messages.is_read, user_messages.is_new")
  end

  # Load a conversation of a user
  # @param user [User] the User object
  # @param friend [User] the User's friend object
  # @return [Array] the array of messages
  #
  # @author DatPB
  def self.load_conversation(user, friend)
    code = Message.get_message_code(user.id, friend.id)

    Message.where("messages.message_code = ?", code).joins("LEFT JOIN user_messages ON messages.id = user_messages.message_id").where("user_messages.user_id = ? AND user_messages.is_deleted = ?", user.id, false).select("messages.*, user_messages.is_read, user_messages.is_new").order(created_at: :desc)
  end

  # Load unread conversation of a user
  # @param user [User] the User object
  # @return [Array] the array of unread conversation
  #     (just user_messages collection, if you want to use message, you need add includes(:message))
  # @author DatPB
  def self.unread_conversation(user)
    user.user_messages.last_msg_on_conversation_of_user.where(is_read: false)
  end

  # Load new conversations of a user
  # @param user [User] the User object
  # @return [Array] the array of new conversations
  #     (just user_messages collection, if you want to use message, you need add includes(:message))
  # @author DatPB
  def self.new_conversation(user)
    user.user_messages.last_msg_on_conversation_of_user.where(is_new: true)
  end

  # Load new messages of a user
  # @param user [User] the User object
  # @return [Array] the array of new messages
  #     (just user_messages collection, if you want to use message, you need add includes(:message))
  # @author DatPB
  def self.new_messages(user)
    user.user_messages.where(is_new: true)
  end

  # Mark a conversation as read/unread ( we will mark the lastest received message of user)
  # @param user [User] the User object
  # @return [Hash] {success: true/false, new_status: read/unread, error_message: }
  #
  # @author DatPB
  def mark_as_read_unread!(user, type = "read")
    return_data = {success: true, new_status: type, error_message: ""}

    # if last_received_msg = Message.where({received_by_id: user.id, message_code: self.message_code}).order(created_at: :desc).first
    #   last_received_msg.is_read = (type == "read")
    #   last_received_msg.save

    #   return_data[:number_unread] = Message.unread(user.id).count
    # else
    #   return_data[:success] = false
    #   return_data[:new_status] = ((type == "read") ? "unread" : "read")
    # end
    begin
      is_read = (type == "read")
      user.user_messages.where("message_code = ? AND message_id <= ?", message_code, id).update_all(is_read: is_read)
      return_data[:number_unread] = Message.unread_conversation(user).count
    rescue Exception => e
      return_data[:success] = false
      return_data[:error_message] = e.message
    end

    return_data
  end

  # hide a conversation for user 
  # we will hide all older messages in this conversation, and this message for user
  # @param user [User] the User object
  # @return [Boolean] true/false 
  #
  # @author DatPB
  def delete_conversation(user)
    return_data = {success: true, error_message: ""}
    begin
      user.user_messages.where("message_code = ? AND message_id <= ?", message_code, id).update_all(is_deleted: true)
      return_data[:number_unread] = Message.unread_conversation(user).count
    rescue Exception => e
      return_data[:success] = false
      return_data[:error_message] = e.message
    end

    return_data
  end
end

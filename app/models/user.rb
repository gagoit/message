# Copyright (c) 2015, @sudharti(Sudharsanan Muralidharan)
# Socify is an Open source Social network written in Ruby on Rails This file is licensed
# under GNU GPL v2 or later. See the LICENSE.

class User < ActiveRecord::Base
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable and :omniauthable
  devise :database_authenticatable, :registerable, :confirmable,
    :recoverable, :rememberable, :trackable, :validatable

  # Messages
  has_many :received_messages, class_name: "Message", foreign_key: :received_by_id, dependent: :destroy
  has_many :created_messages, class_name: "Message", foreign_key: :created_by_id, dependent: :destroy
  has_many :messages, through: :user_messages
  has_many :user_messages

  mount_uploader :avatar, AvatarUploader

  validates_presence_of :name

  scope :search_users, ->(search) { where( "email like ? or name like ?", "%#{search}%", "%#{search}%") }

  def notification_alert_count
    @notification_alert_count ||= notifications.where(:is_visited => false).size
  end

  def get_avatar_url(style = :thumb)
    avatar.url() || ActionController::Base.helpers.asset_path("avatar.jpg")
  end

  def full_name
    name
  end
end

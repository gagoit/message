# Copyright (c) 2015, @sudharti(Sudharsanan Muralidharan)
# Socify is an Open source Social network written in Ruby on Rails This file is licensed
# under GNU GPL v2 or later. See the LICENSE.

class UsersController < ApplicationController
  before_action :authenticate_user!

  def search_friends
    friend_ids = User.all.pluck(:id)

    @users = if params[:q]
      User.search_users( params[:q]).where("id IN (?)", friend_ids)
    else
      User.where("id IN (?)", friend_ids)
    end

    respond_to do |format|
      format.json {
        users_json = []
        @users.all.each do |user|
          users_json << {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.get_avatar_url
          }
        end
        render :json => users_json
      }

      format.html {}
    end
  end
end

const properties = require("./json/properties.json");
const users = require("./json/users.json");
const { Pool } = require("pg");
const { query } = require("express");

const pool = new Pool({
  user: "vagrant",
  password: "123",
  host: "localhost",
  database: "lightbnb",
});

/// Users
/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */

const getUserWithEmail = function (email) {
  return pool
    .query(
      `
SELECT * 
FROM users
WHERE email = $1;
`,
      [email]
    )
    .then((res) => {
      if (res.rows[0]) {
        return Promise.resolve(res.rows[0]);
      } else {
        return null;
      }
    })
    .catch((err) => {
      console.err(err.message);
    });
};

exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  return pool
    .query(`SELECT * FROM users WHERE id = $1;`, [id])
    .then((res) => {
      if (res.rows[0]) {
        return Promise.resolve(res.rows[0]);
      }
      return null;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

exports.getUserWithId = getUserWithId;

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */

const addUser = function (user) {
  return pool
    .query(
      `INSERT INTO users (name, email, password) VALUES ($1, $2, $3)RETURNING *;`,
      [user.name, user.email, user.password]
    )
    .then((res) => {
      if (res.rows[0]) {
        return Promise.resolve(res.rows[0]);
      }
      return null;
    })
    .catch((err) => {
      console.log(err.message);
    });
};
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */

const getAllReservations = function (guest_id, limit = 10) {
  pool
    .query(
      `
  SELECT reservations.id, properties.title, properties.cost_per_night, reservations.start_date, avg(rating) as average_rating
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN property_reviews ON properties.id = property_reviews.property_id
  WHERE reservations.guest_id = $1
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2;
    `,
      [guest_id, limit]
    )
    .then((res) => {
      if (res.rows[0]) {
        return Promise.resolve(res.rows[0]);
      }
      return null;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = (options, limit = 10) => {
  const getAllProperties = function (options, limit = 10) {
    // 1
    const queryParams = [];

    // 2
    let queryString = `
    SELECT properties.*, avg(property_reviews.rating) as average_rating
    FROM properties
    JOIN property_reviews ON properties.id = property_id
    `;

    // city inquiry
    if (options.city) {
      queryParams.push(`%${options.city}%`);
      queryString += `WHERE city LIKE $${queryParams.length} `;
    }

    // based on owner_id
    if (options.owner_id) {
      queryParams.push(`%${options.user_id}%`);
      if (queryParams.length === 1) {
        queryString += `WHERE city LIKE $${queryParams.length} `;
      } else {
        queryString += `AND owner_id = $${queryParams.length}`;
      }
    }

    // min and max price inquiries
    if (options.minimum_price_per_night && options.maximum_price_per_night) {
      queryParams.push(
        options.minimum_price_per_night * 100,
        options.maximum_price_per_night * 100
      );
      if (queryParams === 2) {
        queryString += `WHERE cost_per_night >= $${
          queryParams.length - 1
        } AND cost_per_night <= $${queryParams.length}`;
      } else {
        queryString += `AND cost_per_night >= $${
          queryParams.lenght - 1
        } AND cost_per_night <= $${queryParams.length}`;
      }
    }

    //list the results based on GROUP BY
    queryString += `GROUP BY properties.id`;

    //minimum rating (HAVING) filter - must be last if there's a HAVING exception
    if (options.minium_rating) {
      queryParams.push(options.minimum_rating);
      queryString += `HAVING avg(property_reviews.rating) >= $${queryParams.length}`;
    }

    queryString += `
    GROUP BY properties.id
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
    `;

    console.log(queryString, queryParams);

    return pool.query(queryString, queryParams).then((res) => res.rows);
  };

  return pool
    .query(`SELECT * FROM properties LIMIT $1`, [limit])
    .then((res) => {
      return res.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

exports.getAllProperties = getAllProperties;

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
};
exports.addProperty = addProperty;

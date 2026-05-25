package com.memory.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "object_codes")
public class ObjectCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "number_string", nullable = false, unique = true, length = 2)
    private String numberString;

    @Column(name = "object_name", nullable = false, length = 100)
    private String objectName;

    @Column(length = 255)
    private String hint;

    @Column(nullable = false)
    private Integer weight = 1;

    public ObjectCode() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNumberString() { return numberString; }
    public void setNumberString(String numberString) { this.numberString = numberString; }
    public String getObjectName() { return objectName; }
    public void setObjectName(String objectName) { this.objectName = objectName; }
    public String getHint() { return hint; }
    public void setHint(String hint) { this.hint = hint; }
    public Integer getWeight() { return weight; }
    public void setWeight(Integer weight) { this.weight = weight; }
}
